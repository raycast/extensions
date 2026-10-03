/** An application observed in the foreground. */
export interface AppRef {
  /** Stable identity: bundle id when available, otherwise the display name. */
  key: string;
  /** Human readable name, shown in the UI. */
  name: string;
}

/** Persisted between ticks so each run knows what the previous run saw. */
export interface SamplerState {
  v: 1;
  /** Epoch millis of the previous tick. */
  lastAt: number;
  /** Empty when the previous tick had nothing attributable, e.g. an excluded app. */
  lastKey: string;
  lastName: string;
}

/**
 * One sampling window's worth of time to add to the store.
 *
 * `app` is null when the window had no attributable application but the machine
 * was still observed, which is what a stretch of idle time at a known app looks
 * like once all of it has been subtracted.
 */
export interface DaySlice {
  /**
   * Epoch millis the window started at. The store spreads the window over every
   * hour it covers, active time first and idle after.
   */
  at: number;
  app: { key: string; name: string; seconds: number } | null;
  /** Seconds in this window the machine was idle. */
  idleSeconds: number;
}

export interface DayApp {
  name: string;
  /** 24 entries, seconds of active time per hour of local time. */
  hours: number[];
}

export interface DayFile {
  v: 1;
  /** YYYY-MM-DD in local time. */
  date: string;
  apps: Record<string, DayApp>;
  /**
   * 24 entries, seconds present at the machine but idle.
   *
   * Optional because files written before idle was recorded do not carry it, and
   * an old day should read as "idle unknown" rather than "idle zero".
   */
  idle?: number[];
}
