import { Cache } from "@raycast/api";
import { EMPTY_SNAPSHOT, type Snapshot } from "../types";

const cache = new Cache({ namespace: "usage" });
const KEY = "snapshot";

export function readSnapshot(): Snapshot {
  const raw = cache.get(KEY);
  if (!raw) return { ...EMPTY_SNAPSHOT };
  try {
    return { ...EMPTY_SNAPSHOT, ...(JSON.parse(raw) as Partial<Snapshot>) };
  } catch {
    return { ...EMPTY_SNAPSHOT };
  }
}

export function writeSnapshot(snap: Snapshot): void {
  cache.set(KEY, JSON.stringify(snap));
}
