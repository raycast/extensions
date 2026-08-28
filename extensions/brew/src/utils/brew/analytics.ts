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
 * Fetch (and disk-cache) the bulk install rankings for formulae and casks.
 *
 * Deliberately NOT memoized in a module-level promise. There is one consumer
 * (usePopularityRanks, which runs once per mount), so a shared promise bought
 * nothing — and it meant a shared abort signal: whoever started the fetch owned
 * cancellation for everyone who joined it, so one consumer aborting rejected
 * another's load with an AbortError it never asked for.
 *
 * Re-reading the cached files costs a disk read and a parse; the expensive part
 * (the download) is already avoided by downloadRemoteToCache's freshness check.
 */
export function fetchPopularityRanks(
  onProgress?: DownloadProgressCallback,
  signal?: AbortSignal,
): Promise<PopularityRanks> {
  return Promise.all([
    loadRanks(formulaRanksRemote, onProgress, signal),
    loadRanks(caskRanksRemote, onProgress, signal),
  ]).then(([formulae, casks]) => {
    fetchLogger.log("Loaded popularity ranks", {
      period: POPULARITY_PERIOD,
      formulae: formulae.size,
      casks: casks.size,
    });
    return { formulae, casks };
  });
}
