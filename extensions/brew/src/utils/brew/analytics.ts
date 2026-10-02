/**
 * Homebrew install analytics from formulae.brew.sh.
 *
 * Two independent sources, deliberately:
 *
 * 1. **Per-package JSON** (~5KB) — `api/formula/<name>.json` carries an
 *    `analytics` object with 30/90/365-day install counts. Fetched lazily for
 *    the selected row only, to drive the detail panel.
 * 2. **Bulk rankings** (~1.7MB formulae + ~1.2MB casks) — `api/analytics/…`
 *    lists every package with its rank and count. Needed for the popularity
 *    sort, which has to order the *whole* index before it is sliced to the
 *    first N results.
 *
 * The bulk files are not a substitute for the per-package ones: covering all
 * three periods in bulk would mean ~9MB of downloads for three numbers.
 */

import { readFile } from "fs/promises";
import { DownloadProgressCallback } from "../types";
import { cachePath, downloadRemoteToCache } from "../cache";
import { fetchLogger } from "../logger";
import { POPULARITY_PERIOD, PopularityRanks, RankedResponse, analyticsCacheFiles, parseRanks } from "./analyticsParse";

export * from "./analyticsParse";

const apiBase = "https://formulae.brew.sh/api";

/// Per-package analytics (detail panel)

/** URL of the per-package API JSON, which includes its `analytics` block. */
export function packageAnalyticsURL(name: string, isCask: boolean): string {
  return `${apiBase}/${isCask ? "cask" : "formula"}/${encodeURIComponent(name)}.json`;
}

/// Bulk popularity rankings (sort)

const formulaRanksRemote = {
  url: `${apiBase}/analytics/install/${POPULARITY_PERIOD}.json`,
  cachePath: cachePath(analyticsCacheFiles[0]),
};

const caskRanksRemote = {
  url: `${apiBase}/analytics/cask-install/${POPULARITY_PERIOD}.json`,
  cachePath: cachePath(analyticsCacheFiles[1]),
};

async function loadRanks(
  remote: { url: string; cachePath: string },
  onProgress?: DownloadProgressCallback,
  signal?: AbortSignal,
) {
  await downloadRemoteToCache(remote.url, remote.cachePath, onProgress, signal);
  const response: RankedResponse = JSON.parse(await readFile(remote.cachePath, "utf8"));
  return parseRanks(response);
}

/**
 * Ranks already parsed in this process. Caching the RESULT, not the in-flight
 * promise: a shared promise also shares one abort signal, so whichever consumer
 * started the load owned cancellation for everyone who joined it. Only
 * successes are stored, so an aborted or failed load leaves nothing behind to
 * retry around.
 */
let cachedRanks: PopularityRanks | undefined;

/**
 * Bumped by every invalidation. A load that started before the bump must not
 * install its result afterwards — it was parsed from files Clear Cache has
 * since deleted, and without this it would silently repopulate stale ranks.
 */
let ranksGeneration = 0;

/**
 * Drop the cached rankings so the next fetch re-reads from disk.
 *
 * Required after clearCache(): it deletes the files these were parsed from,
 * and without this the process would keep serving rankings that no longer have
 * a backing cache.
 */
export function invalidatePopularityRanks(): void {
  cachedRanks = undefined;
  ranksGeneration++;
}

/**
 * Fetch (and disk-cache) the bulk install rankings for formulae and casks.
 *
 * `usePromise` re-runs its callback on mount, on every `execute` transition
 * (⇧⌘P toggling), and on revalidate — so without the in-process cache, each
 * toggle re-reads and re-parses ~2.6MB of JSON. The download itself is already
 * avoided by downloadRemoteToCache's freshness check; this avoids the parse.
 */
export function fetchPopularityRanks(
  onProgress?: DownloadProgressCallback,
  signal?: AbortSignal,
): Promise<PopularityRanks> {
  if (cachedRanks) {
    return Promise.resolve(cachedRanks);
  }

  const generation = ranksGeneration;

  return Promise.all([
    loadRanks(formulaRanksRemote, onProgress, signal),
    loadRanks(caskRanksRemote, onProgress, signal),
  ]).then(([formulae, casks]) => {
    const ranks = { formulae, casks };
    fetchLogger.log("Loaded popularity ranks", {
      period: POPULARITY_PERIOD,
      formulae: formulae.size,
      casks: casks.size,
      stale: generation !== ranksGeneration,
    });

    // Invalidated while this load was in flight: hand the result to this caller
    // but do not install it, so the next call re-reads from disk.
    if (generation === ranksGeneration) {
      cachedRanks = ranks;
    }
    return ranks;
  });
}
