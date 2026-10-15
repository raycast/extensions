// When indexing has to wait: the user's pause, the index hours, and the power state (DigUp: PowerPolicy,
// IndexSchedule, Kit/IndexHours). DigUp hears power, thermal and wake notifications; Node hears none, so this reads the
// helper's `power` op every minute, notices a wake from a jump in the wall clock, and sets one timer for the next
// start or end of the index hours.

import type { Config, Status } from "./api";
import { Helper, type PowerStatus } from "./helper";
import type { Log } from "./log";

/** The holds the policy decides. "setup" is the service's own. */
export type PolicyHeld = Exclude<Status["held"], "setup">;

/** The hours indexing may run, in minutes after midnight, across midnight when `end` comes first; start = end means all
 *  day (DigUp: IndexHours). */
export class IndexHours {
  readonly start: number;
  readonly end: number;

  constructor(start: number, end: number) {
    this.start = ((start % 1440) + 1440) % 1440;
    this.end = ((end % 1440) + 1440) % 1440;
  }

  /** api.ts keeps whole hours (start inclusive, end exclusive); null = any time. */
  static fromConfig(hours: Config["indexHours"]): IndexHours | null {
    return hours ? new IndexHours(hours.start * 60, hours.end * 60) : null;
  }

  contains(date: Date): boolean {
    if (this.start === this.end) return true;
    const minute = date.getHours() * 60 + date.getMinutes();
    return this.start < this.end
      ? minute >= this.start && minute < this.end
      : minute >= this.start || minute < this.end;
  }

  /** When `contains` changes next after `date`: the next end inside the hours, the next start outside them. A time the
   *  clock skips (02:30 the night clocks go forward) counts as the next one that exists. Null: all day. */
  nextChange(date: Date): Date | null {
    if (this.start === this.end) return null;
    const minute = this.contains(date) ? this.end : this.start;
    const next = new Date(date);
    next.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    if (next.getTime() <= date.getTime()) {
      next.setDate(next.getDate() + 1);
      next.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    }
    return next;
  }
}

export interface Decision {
  held: PolicyHeld;
  /** Epoch ms when indexing may run again (outside the index hours: their next start); null otherwise. */
  until: number | null;
}

/**
 * Why indexing waits now: paused > outside index hours > Low Power Mode > Mac is warm > on battery (only with
 * `indexOnBattery` off). `power` null (it couldn't be read): no power hold, as DigUp treats a Mac without power-source
 * info as on AC.
 */
export function decide(o: {
  paused: boolean;
  hours: IndexHours | null;
  indexOnBattery: boolean;
  power: PowerStatus | null;
  now: Date;
}): Decision {
  if (o.paused) return { held: "paused", until: null };
  if (o.hours && !o.hours.contains(o.now)) {
    return { held: "outside index hours", until: o.hours.nextChange(o.now)?.getTime() ?? null };
  }
  if (o.power?.lowPower) return { held: "Low Power Mode", until: null };
  if (o.power?.thermal === "serious" || o.power?.thermal === "critical") return { held: "Mac is warm", until: null };
  if (!o.indexOnBattery && o.power?.onBattery) return { held: "on battery", until: null };
  return { held: null, until: null };
}

/** Reads the power state with a helper of its own, started for the read and ended after it: the service's helper may
 *  be busy for minutes with one file, and a minute between reads isn't worth a resident process. */
export function powerFromHelper(bin: string, log: Log): () => Promise<PowerStatus> {
  return async () => {
    const helper = new Helper(bin, log);
    try {
      return await helper.power();
    } finally {
      await helper.close();
    }
  };
}

export interface PolicyOptions {
  log: Log;
  power: () => Promise<PowerStatus>;
  /** Called with the first decision and then whenever it changes. */
  onHeld: (held: PolicyHeld, until: number | null) => void;
  /** Between power reads (DigUp has events; a minute stands in). */
  intervalMs?: number;
  /** How often the wall clock is compared with the timers, to notice a wake. */
  heartbeatMs?: number;
  /** A heartbeat this much later than due means the Mac slept. */
  wakeGapMs?: number;
  /** The first read waits this long at most; the daemon starts without it. */
  firstReadMs?: number;
  now?: () => number;
}

type PolicyConfig = Pick<Config, "paused" | "indexHours" | "indexOnBattery">;

export class Policy {
  private config: PolicyConfig;
  private hours: IndexHours | null;
  private power: PowerStatus | null = null;
  private last: Decision | null = null;
  private interval: NodeJS.Timeout | null = null;
  private heartbeat: NodeJS.Timeout | null = null;
  private boundary: NodeJS.Timeout | null = null;
  private lastBeat = 0;
  private reading: Promise<void> | null = null;
  private powerFailed = false;
  private stopped = false;
  private readonly now: () => number;

  constructor(
    config: PolicyConfig,
    private readonly o: PolicyOptions,
  ) {
    this.config = { paused: config.paused, indexHours: config.indexHours, indexOnBattery: config.indexOnBattery };
    this.hours = IndexHours.fromConfig(config.indexHours);
    this.now = o.now ?? Date.now;
  }

  /** The decision so far. */
  get current(): Decision | null {
    return this.last;
  }

  /** Reads the power state (waiting `firstReadMs` at most), decides, and starts the timers. */
  async start(): Promise<void> {
    const first = this.refresh();
    const limit = this.o.firstReadMs ?? 3000;
    let timer: NodeJS.Timeout | undefined;
    await Promise.race([first, new Promise<void>((done) => (timer = setTimeout(done, limit)))]);
    clearTimeout(timer);
    // Without the power state yet (a slow helper): decide on the rest now; the read decides again when it lands.
    if (!this.last) this.evaluate();
    if (this.stopped) return;
    const interval = this.o.intervalMs ?? 60_000;
    const beat = this.o.heartbeatMs ?? 5000;
    this.interval = setInterval(() => void this.refresh(), interval);
    this.interval.unref();
    this.lastBeat = this.now();
    this.heartbeat = setInterval(() => this.beat(beat), beat);
    this.heartbeat.unref();
  }

  /** New settings: the pause and the hours take effect at once; the power state is read again for the battery switch. */
  update(config: PolicyConfig): void {
    const before = this.config;
    this.config = { paused: config.paused, indexHours: config.indexHours, indexOnBattery: config.indexOnBattery };
    this.hours = IndexHours.fromConfig(config.indexHours);
    this.evaluate();
    if (before.indexOnBattery !== config.indexOnBattery || (before.paused && !config.paused)) void this.refresh();
  }

  /** Reads the power state and decides. One read at a time. */
  refresh(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    this.reading ??= this.read().finally(() => (this.reading = null));
    return this.reading;
  }

  stop(): void {
    this.stopped = true;
    for (const timer of [this.interval, this.heartbeat]) if (timer) clearInterval(timer);
    if (this.boundary) clearTimeout(this.boundary);
    this.interval = this.heartbeat = this.boundary = null;
  }

  private async read(): Promise<void> {
    try {
      this.power = await this.o.power();
      if (this.powerFailed) this.o.log.info("policy: the power state can be read again");
      this.powerFailed = false;
    } catch (error) {
      // As DigUp without power-source info: no power hold. Said once, not every minute.
      if (!this.powerFailed)
        this.o.log.warn(`policy: can't read the power state: ${(error as Error)?.message ?? error}`);
      this.powerFailed = true;
      this.power = null;
    }
    this.evaluate();
  }

  private beat(beatMs: number): void {
    const now = this.now();
    const late = now - this.lastBeat - beatMs;
    this.lastBeat = now;
    if (late < (this.o.wakeGapMs ?? 15_000)) return;
    this.o.log.info(`policy: the Mac woke (${Math.round(late / 1000)} s gap)`);
    // The hours may have turned and the power changed while it slept.
    this.evaluate();
    void this.refresh();
  }

  private evaluate(): void {
    if (this.stopped) return;
    const now = new Date(this.now());
    const next = decide({
      paused: this.config.paused,
      hours: this.hours,
      indexOnBattery: this.config.indexOnBattery,
      power: this.power,
      now,
    });
    this.schedule(now);
    if (this.last && this.last.held === next.held && this.last.until === next.until) return;
    this.last = next;
    const when = next.until ? ` until ${new Date(next.until).toLocaleTimeString()}` : "";
    this.o.log.info(`policy: ${next.held ? `indexing waits (${next.held}${when})` : "indexing may run"}`);
    this.o.onHeld(next.held, next.until);
  }

  /** One timer for the next start or end of the hours, a second after it so the hour has turned (DigUp). */
  private schedule(now: Date): void {
    if (this.boundary) clearTimeout(this.boundary);
    this.boundary = null;
    const next = this.hours?.nextChange(now);
    if (!next) return;
    this.boundary = setTimeout(() => this.evaluate(), Math.max(0, next.getTime() - now.getTime()) + 1000);
    this.boundary.unref();
  }
}
