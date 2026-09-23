import { getValDetail, listFiles, readFile } from "./api";
import { cacheReadme, cacheVal, cachedReadme, cachedVal } from "./cache";

/**
 * A val's README, read straight through the cache. `list_files` carries a per-file `version`, so the
 * listing alone says whether the cached copy is still current — the content is only fetched when it
 * is not. Missing is the common case, so nothing here treats it as an error.
 */
export async function loadReadme(val: string, signal?: AbortSignal): Promise<string | null> {
  const { files } = await listFiles(val, {}, signal);
  const found = files.find((file) => file.name.toUpperCase() === "README.MD");
  if (!found) {
    // Cached too: a val without a README should not be re-listed on every hover.
    cacheReadme(val, { version: -1, content: "" });
    return null;
  }

  const cached = cachedReadme(val);
  if (cached?.version === found.version) return cached.content || null;

  const { content } = await readFile(val, found.path, {}, signal);
  cacheReadme(val, { version: found.version, content });
  return content || null;
}

/** Once per process per val: hovering the same row twice should not re-check anything. */
const checked = new Set<string>();

/**
 * Warms the val's cache from a hover. One `get_val_detail` is the staleness check: its main-branch
 * version moves on every commit, so a matching version means the cached detail and README are still
 * current and nothing else is fetched. A failed check serves the cache rather than clearing it.
 */
export function prefetchVal(val: string): void {
  if (checked.has(val)) return;
  checked.add(val);

  void (async () => {
    const detail = await getValDetail(val).catch(() => null);
    if (!detail) return;

    const items = detail.branches?.items ?? [];
    const main = items.find((branch) => branch.name === "main") ?? items[0];
    const version = main?.version ?? -1;

    if (cachedVal(val)?.version !== version) {
      cacheVal(val, { version, detail });
      await loadReadme(val).catch(() => undefined);
    } else if (!cachedReadme(val)) {
      await loadReadme(val).catch(() => undefined);
    }
  })();
}
