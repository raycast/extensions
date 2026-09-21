/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Test stand-in for `@chrismessina/raycast-logger`.
 *
 * The real package is CommonJS and `require`s `@raycast/api` from inside
 * node_modules, where the vitest alias for that module cannot reach it — so
 * importing ANY module that logs (most of `utils/`) failed to resolve under
 * test, which is why `cache.ts` had no tests. Logging is not what these tests
 * are about; swallowing it is enough.
 *
 * Parameters are named and unused on purpose: they document the real signature.
 */

export class Logger {
  constructor(options?: { prefix?: string }) {}
  child(prefix: string): Logger {
    return this;
  }
  log(...args: unknown[]): void {}
  warn(...args: unknown[]): void {}
  error(...args: unknown[]): void {}
}
