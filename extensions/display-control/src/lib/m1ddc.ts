import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { setTimeout } from "node:timers/promises";
import { promisify } from "node:util";

export const controls = ["volume", "luminance", "contrast"] as const;
export type Control = (typeof controls)[number];
export type Display = { id: string; name: string };
export type Reading = { current: number; maximum: number; unconfirmed?: boolean };
export type ControlState = { reading: Reading; error?: string } | { reading?: never; error: string };
export type DisplayState = Record<Control, ControlState>;
export type Execute = (args: string[], signal?: AbortSignal) => Promise<string>;

const execFileAsync = promisify(execFile);

export class M1ddcNotFoundError extends Error {
  constructor() {
    super("Install m1ddc through Raycast's Brew extension, then check again.");
    this.name = "M1ddcNotFoundError";
  }
}

export async function findM1ddc(customPath?: string): Promise<string> {
  const configured = customPath?.trim();
  if (configured && !isAbsolute(configured)) {
    throw new Error("The m1ddc path must be an absolute path to the executable.");
  }
  const candidates = configured ? [configured] : ["/opt/homebrew/bin/m1ddc", "/usr/local/bin/m1ddc"];
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Raycast does not inherit the user's shell PATH, so Homebrew paths are checked explicitly.
    }
  }
  if (configured) {
    throw new Error("The configured m1ddc executable is unavailable. Check its path in extension preferences.");
  }
  throw new M1ddcNotFoundError();
}

export function createExecutor(path: string): Execute {
  return async (args, signal) => {
    try {
      const { stdout } = await execFileAsync(path, args, { timeout: 5000, maxBuffer: 1024 * 1024, signal });
      return stdout.trim();
    } catch (error) {
      if (signal?.aborted) throw error;
      const failure = error as { stdout?: string; stderr?: string; killed?: boolean; message?: string };
      throw new Error(
        failure.killed
          ? "The display did not respond within five seconds."
          : failure.stdout?.trim() || failure.stderr?.trim() || failure.message || "m1ddc could not reach the display.",
      );
    }
  };
}

export function parseDisplays(output: string): Display[] {
  if (!output.trim() || /no external display found/i.test(output)) return [];
  const displays: Display[] = [];
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*\[\d+\]\s+(.+)\s+\(([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\)\s*$/i);
    if (match) displays.push({ id: match[2], name: match[1].trim() });
  }
  if (displays.length === 0) throw new Error("m1ddc returned an unexpected display list. Check your m1ddc version.");
  return displays;
}

function parseValue(output: string): number {
  const value = Number(output.trim());
  if (!/^\d+$/.test(output.trim()) || !Number.isSafeInteger(value) || value > 65535) {
    throw new Error("The display did not return a valid value for this control.");
  }
  return value;
}

export function percentage(reading: Reading): number {
  return Math.round((reading.current / reading.maximum) * 100);
}

export function adjustedValue(reading: Reading, direction: -1 | 1, step: number): number {
  if (!Number.isFinite(step) || step <= 0 || step > 100)
    throw new Error("The adjustment step must be between 1 and 100.");
  const delta = Math.max(1, Math.round((reading.maximum * step) / 100));
  return Math.min(reading.maximum, Math.max(0, reading.current + direction * delta));
}

export function valueAtPercentage(percent: number, maximum: number): number {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error("The default level must be between 0% and 100%.");
  }
  return Math.round((maximum * percent) / 100);
}

export class M1ddc {
  private pending: Promise<unknown> = Promise.resolve();
  private hasCommand = false;
  private readings = new Map<string, { reading: Reading; time: number }>();

  constructor(
    private readonly execute: Execute,
    private readonly pause: (milliseconds: number, signal?: AbortSignal) => Promise<void> = (milliseconds, signal) =>
      setTimeout(milliseconds, undefined, { signal }),
  ) {}

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    // DDC operations share a bus. Complete each read/write sequence before starting the next one.
    const result = this.pending.then(operation);
    this.pending = result.catch(() => undefined);
    return result;
  }

  private async command(args: string[], signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted();
    if (this.hasCommand) await this.pause(100, signal);
    signal?.throwIfAborted();
    this.hasCommand = true;
    // Finish an in-flight DDC read even if focus changes, so its reply does not leak into the next query.
    return this.execute(args);
  }

  private key(id: string, control: Control): string {
    return `${id.toLowerCase()}/${control}`;
  }

  private remember(id: string, control: Control, reading: Reading): Reading {
    this.readings.set(this.key(id, control), { reading, time: Date.now() });
    return reading;
  }

  async waitForIdle(): Promise<void> {
    await this.pending;
    if (this.hasCommand) await this.pause(100);
  }

  listDisplays(): Promise<Display[]> {
    return this.enqueue(async () => {
      try {
        return parseDisplays(await this.command(["display", "list"]));
      } catch (error) {
        if (error instanceof Error && /no external display found/i.test(error.message)) return [];
        throw error;
      }
    });
  }

  private async read(id: string, control: Control, signal?: AbortSignal): Promise<Reading> {
    for (let attempt = 0; ; attempt++) {
      try {
        const current = parseValue(await this.command(["display", id, "get", control], signal));
        signal?.throwIfAborted();
        const known = this.readings.get(this.key(id, control))?.reading;
        const maximum = known?.maximum ?? parseValue(await this.command(["display", id, "max", control], signal));
        if (maximum === 0 || current > maximum) {
          throw new Error("The display reported an invalid range for this control.");
        }
        if (!known && maximum !== parseValue(await this.command(["display", id, "max", control], signal))) {
          throw new Error("The display reported an inconsistent maximum for this control.");
        }
        signal?.throwIfAborted();
        return this.remember(id, control, { current, maximum });
      } catch (error) {
        signal?.throwIfAborted();
        if (attempt >= 2) throw error;
        await this.pause(200 * (attempt + 1), signal);
      }
    }
  }

  readControls(id: string, signal?: AbortSignal): Promise<DisplayState> {
    return this.enqueue(async () => {
      const state = {} as DisplayState;
      for (const control of controls) {
        signal?.throwIfAborted();
        try {
          state[control] = { reading: await this.read(id, control, signal) };
        } catch (error) {
          signal?.throwIfAborted();
          const previous = this.readings.get(this.key(id, control))?.reading;
          state[control] = {
            ...(previous ? { reading: previous } : {}),
            error: error instanceof Error ? error.message : "The display could not read this control.",
          };
        }
      }
      return state;
    });
  }

  private async latest(id: string, control: Control): Promise<Reading> {
    const cached = this.readings.get(this.key(id, control));
    return cached && Date.now() - cached.time < 2000 ? cached.reading : this.read(id, control);
  }

  private async write(id: string, control: Control, before: Reading, target: number): Promise<Reading> {
    if (target === before.current && !before.unconfirmed) return before;
    for (let attempt = 0; ; attempt++) {
      try {
        const output = await this.command(["display", id, "set", control, String(target)]);
        if (output !== `Writing ${target}`) throw new Error("m1ddc did not confirm the requested write.");
        break;
      } catch (error) {
        const transient =
          error instanceof Error &&
          /suitable external display|DDC communication failure|did not respond/i.test(error.message);
        if (!transient || attempt >= 2) throw error;
        await this.pause(200 * (attempt + 1));
      }
    }
    const requested = this.remember(id, control, { current: target, maximum: before.maximum, unconfirmed: true });
    try {
      return await this.read(id, control);
    } catch {
      // m1ddc accepted the write. A bad readback must not replay it or disable the controls.
      return requested;
    }
  }

  adjust(id: string, control: Control, direction: -1 | 1, step: number): Promise<Reading> {
    return this.enqueue(async () => {
      const before = await this.latest(id, control);
      return this.write(id, control, before, adjustedValue(before, direction, step));
    });
  }

  set(id: string, control: Control, percent: number): Promise<Reading> {
    return this.enqueue(async () => {
      valueAtPercentage(percent, 100);
      const before = await this.latest(id, control);
      return this.write(id, control, before, valueAtPercentage(percent, before.maximum));
    });
  }
}
