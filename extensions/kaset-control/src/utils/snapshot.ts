import { Cache } from "@raycast/api";

// Raycast's own start-up dominates the ~1s "Loading player..." wait: the
// AppleScript calls behind it measure ~0.2s each. `Cache` is synchronous
// (unlike `LocalStorage`), so the last known snapshot can be read during the
// very first render and painted immediately, then replaced by live data.
const cache = new Cache({ namespace: "kaset-control" });

export const SNAPSHOT_KEYS = {
  library: "snapshot.library",
  state: "snapshot.state",
} as const;

export function readSnapshot<T>(key: string): T | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // A corrupt entry is not worth failing the command over.
    return undefined;
  }
}

export function writeSnapshot<T>(key: string, value: T): void {
  try {
    cache.set(key, JSON.stringify(value));
  } catch {
    // Cache writes are an optimisation; never let one break playback control.
  }
}
