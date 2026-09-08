import { Cache } from "@raycast/api";
import { UsageMeta } from "./spotlight";
import { dataGeneration, withStorageLock } from "./storage-lock";

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

export async function writeCachedUsage(
  dir: string,
  meta: Map<string, UsageMeta>,
  generation = dataGeneration(),
): Promise<void> {
  if (meta.size === 0) return;
  try {
    await withStorageLock(async () => {
      cache.set(dir, JSON.stringify(Object.fromEntries(meta)));
    }, generation);
  } catch {
    // A cache write failure does not affect current results.
  }
}
