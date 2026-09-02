import { Cache } from "@raycast/api";
import { UsageMeta } from "./spotlight";

/** Directory-keyed cache of Spotlight usage metadata. */
const cache = new Cache({ namespace: "usage-meta" });

type Serialized = Record<string, UsageMeta>;

export function clearUsageCache(): void {
  cache.clear({ notifySubscribers: false });
}

export function readCachedUsage(dir: string): Map<string, UsageMeta> {
  const raw = cache.get(dir);
  if (!raw) return new Map();
  try {
    const parsed = JSON.parse(raw) as Serialized;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

export function writeCachedUsage(
  dir: string,
  meta: Map<string, UsageMeta>,
): void {
  if (meta.size === 0) return;
  try {
    cache.set(dir, JSON.stringify(Object.fromEntries(meta)));
  } catch {
    // A cache write failure does not affect current results.
  }
}
