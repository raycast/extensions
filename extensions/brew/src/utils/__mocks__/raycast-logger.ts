/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Test stand-in for `@chrismessina/raycast-logger`.
 *
 * The real package is CommonJS and `require`s `@raycast/api` from inside
 * node_modules, where the vitest alias for that module cannot reach it — so
 * importing ANY module that logs (most of `utils/`) failed to resolve under
 * test, which is why `cache.ts` had no tests.
 *
 * Calls are RECORDED in `__logs`, not swallowed: where a log line is the only
 * trace an action leaves — `confirmAndRun` running `sudo chown` for Doctor — a
 * test has to be able to see it, or losing it is invisible.
 *
 * Parameters are named and unused on purpose: they document the real signature.
 */

export interface LoggedCall {
  level: "log" | "warn" | "error";
  message: unknown;
  data: unknown;
}

/** Every call, in order. Reset it in `beforeEach` where a test reads it. */
export const __logs: LoggedCall[] = [];

export class Logger {
  constructor(options?: { prefix?: string }) {}
  child(prefix: string): Logger {
    return this;
  }
  log(message?: unknown, data?: unknown): void {
    __logs.push({ level: "log", message, data });
  }
  warn(message?: unknown, data?: unknown): void {
    __logs.push({ level: "warn", message, data });
  }
  error(message?: unknown, data?: unknown): void {
    __logs.push({ level: "error", message, data });
  }
}
