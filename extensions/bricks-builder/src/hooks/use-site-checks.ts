import { useCachedPromise, usePromise } from "@raycast/utils";
import { loadSites, Site, withoutSecrets } from "../lib/sites";

/**
 * Runs `check` on every saved site, for lists of all sites (Bricks Site Health, Bricks Raycast Pro).
 *
 * The results are cached so the list shows at once, but Raycast's cache is stored unencrypted on
 * disk, so cached rows keep their site without its application password. Rows only show once the
 * saved sites have loaded, each with its full saved site, and rows are left out for sites that were
 * deleted, or whose address or user changed, until the next check has run.
 *
 * `cacheKey` keeps each command's cache apart; `isValid` drops rows an older version cached.
 */
export function useSiteChecks<T extends { site: Site }>(
  cacheKey: string,
  check: (site: Site) => Promise<T>,
  isValid: (row: T) => boolean,
) {
  const saved = usePromise(loadSites);
  const checks = useCachedPromise(
    async (key: string) => {
      void key;
      const rows = await Promise.all((await loadSites()).map(check));
      return rows.map((row) => ({ ...row, site: withoutSecrets(row.site) }));
    },
    [cacheKey],
    { keepPreviousData: true },
  );

  const rows: T[] = [];
  for (const row of checks.data ?? []) {
    const site = saved.data?.find((s) => s.id === row.site.id);
    if (!site || !isValid(row) || site.url !== row.site.url || site.username !== row.site.username) continue;
    rows.push({ ...row, site });
  }

  return {
    rows,
    isLoading: saved.isLoading || checks.isLoading,
    /** Checks the sites again. */
    recheck: () => checks.revalidate(),
    /** Reloads the saved sites too, after one was added, edited or removed. */
    reload: () => {
      saved.revalidate();
      return checks.revalidate();
    },
  };
}
