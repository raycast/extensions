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

async function loadRanks(remote: { url: string; cachePath: string }, onProgress?: DownloadProgressCallback) {
  await downloadRemoteToCache(remote.url, remote.cachePath, onProgress);
  const response: RankedResponse = JSON.parse(await readFile(remote.cachePath, "utf8"));
  return parseRanks(response);
}

/**
 * Fetch (and disk-cache) the bulk install rankings for formulae and casks.
 *
 * Memoized for the lifetime of the command process: the caller re-runs a search
 * on every keystroke, and each call would otherwise re-read ~3MB from disk.
 */
let ranksPromise: Promise<PopularityRanks> | undefined;

/**
 * Drop the memoized rankings, so the next fetch re-downloads.
 *
 * Required after clearCache(): it deletes the files underneath this promise,
 * which would otherwise keep serving rankings from a cache that no longer
 * exists on disk.
 */
export function invalidatePopularityRanks(): void {
  ranksPromise = undefined;
}

export function fetchPopularityRanks(onProgress?: DownloadProgressCallback): Promise<PopularityRanks> {
  if (!ranksPromise) {
    ranksPromise = Promise.all([loadRanks(formulaRanksRemote, onProgress), loadRanks(caskRanksRemote, onProgress)])
      .then(([formulae, casks]) => {
        fetchLogger.log("Loaded popularity ranks", {
          period: POPULARITY_PERIOD,
          formulae: formulae.size,
          casks: casks.size,
        });
        return { formulae, casks };
      })
      .catch((error) => {
        // Don't cache a failure — the next attempt should retry the download.
        ranksPromise = undefined;
        throw error;
      });
  }
  return ranksPromise;
}
