/**
 * Packages with a brew operation running in this command, so a second press
 * of Install or Upgrade is refused instead of starting a second `brew` process.
 * That second process loses Homebrew's lock and fails with "Another brew
 * process is already running", while the first one carries on.
 *
 * The key is the package, not the action: an installed-cache refresh landing
 * mid-install can turn a row's Install into Upgrade, and pressing that one
 * collided with the install just the same.
 *
 * Observable, so a row can show its package is busy the moment the action
 * starts (`useInFlight`), rather than after the first `brew` call returns.
 *
 * Scoped to one command's lifetime, which is the case a repeated press
 * creates. Two commands racing each other still meet brew's own lock.
 */
import { useSyncExternalStore } from "react";

const running = new Map<string, string>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function inFlightKey(cask: boolean, identifier: string): string {
  return `${cask ? "cask" : "formula"}:${identifier.toLowerCase()}`;
}

/**
 * Claim `key` while `label` ("Installing given…") runs, returning a release
 * function, or `undefined` when the key is already claimed. Release in a
 * `finally`. Releasing twice is harmless: it cannot free a later claim.
 */
export function claimInFlight(key: string, label: string): (() => void) | undefined {
  if (running.has(key)) return undefined;
  running.set(key, label);
  notify();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    running.delete(key);
    notify();
  };
}

export function inFlightLabel(key: string): string | undefined {
  return running.get(key);
}

export function subscribeInFlight(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** What `runClaimed` returns when something else already holds the key. */
export const BUSY = Symbol("busy");

/** The longest `runClaimed` waits on a refresh before releasing anyway. */
export const REFRESH_WAIT_MS = 30_000;

/**
 * Run `fn` holding the claim on `key`, then wait for `after(result)`, the
 * view's refresh, before releasing. Until the refresh lands the row still
 * shows the old state, and its action would run again on a package that has
 * already changed. Returns `BUSY`, running nothing, when the key is held.
 *
 * The wait is capped at `REFRESH_WAIT_MS`, so a read that hangs cannot keep
 * the package claimed, and a refresh that rejects does not fail the action:
 * `revalidate` from `@raycast/utils` reports its own errors and never rejects.
 */
export async function runClaimed<T>(
  key: string,
  label: string,
  fn: () => Promise<T>,
  after?: (result: T) => unknown,
): Promise<T | typeof BUSY> {
  const release = claimInFlight(key, label);
  if (!release) return BUSY;
  try {
    const result = await fn();
    const refresh = after?.(result);
    if (refresh instanceof Promise) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        refresh.catch(() => undefined),
        new Promise((resolve) => (timer = setTimeout(resolve, REFRESH_WAIT_MS))),
      ]);
      clearTimeout(timer);
    }
    return result;
  } finally {
    release();
  }
}

export function useInFlight(key: string): string | undefined {
  return useSyncExternalStore(subscribeInFlight, () => inFlightLabel(key));
}
