import { vi } from "vitest";

/** Fake timers for one test. `using` restores real timers. */
export function fakeTimers() {
  vi.useFakeTimers();
  return { [Symbol.dispose]: () => void vi.useRealTimers() };
}
