import { HistoryData } from "../types";
import { getLogger } from "./logger";
import { TIMEOUTS, withRetry, isTransientError } from "./config";

const log = getLogger("wayback");
const ARCHIVE_BASE_URL = "https://archive.org";
const WAYBACK_BASE_URL = "https://web.archive.org";

/**
 * Fetch with timeout and retry - aborts if request takes too long, retries on transient failures
 */
async function fetchWithTimeoutAndRetry(url: string, timeoutMs: number = TIMEOUTS.WAYBACK_FETCH): Promise<Response> {
  return withRetry(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    },
    { maxAttempts: 2, isRetryable: isTransientError },
  );
}

export async function fetchWaybackMachineData(url: string): Promise<HistoryData | undefined> {
  try {
    log.log("wayback:start", { url });

    // First check if any snapshots exist
    const apiUrl = `${ARCHIVE_BASE_URL}/wayback/available?url=${encodeURIComponent(url)}`;
    const response = await fetchWithTimeoutAndRetry(apiUrl);

    // Check for rate limiting (429) or server errors
    if (response.status === 429) {
      log.warn("wayback:rate-limited", { url, status: response.status });
      return {
        rateLimited: true,
        archiveUrl: `${WAYBACK_BASE_URL}/web/*/${url}`,
      };
    }

    if (!response.ok) {
      log.warn("wayback:error", { url, status: response.status });
      return undefined;
    }

    const data = (await response.json()) as {
      archived_snapshots?: {
        closest?: {
          timestamp?: string;
          url?: string;
        };
      };
    };

    log.log("wayback:availability-response", {
      url,
      hasClosest: !!data.archived_snapshots?.closest,
      closest: data.archived_snapshots?.closest,
    });

    // Note: The availability API can be unreliable (returns no closest even when snapshots exist)
    // So we proceed to CDX API regardless - it's the source of truth

    // Use showNumPages=true for fast count - returns just the page count without downloading all data
    const cdxCountUrl = `${WAYBACK_BASE_URL}/cdx/search/cdx?url=${encodeURIComponent(url)}&showNumPages=true`;
    log.log("wayback:cdx-count-start", { url, cdxCountUrl });

    let snapshotCount = 0;
    let pageCount = 0;
    let firstTimestamp: string | undefined;
    let lastTimestamp: string | undefined;
    let rateLimited = false;
    let isEstimate = false;

    try {
      const cdxCountResponse = await fetchWithTimeoutAndRetry(cdxCountUrl);
      log.log("wayback:cdx-count-response", { url, status: cdxCountResponse.status });

      // Check for rate limiting on CDX API
      if (cdxCountResponse.status === 429) {
        log.warn("wayback:cdx-rate-limited", { url, status: cdxCountResponse.status });
        rateLimited = true;
      } else if (cdxCountResponse.ok) {
        const countText = await cdxCountResponse.text();
        log.log("wayback:cdx-count-text", { url, countText: countText.substring(0, 100) });
        pageCount = parseInt(countText.trim(), 10);
        if (!isNaN(pageCount) && pageCount > 0) {
          log.log("wayback:cdx-page-count", { url, pageCount });
        }
      } else {
        log.warn("wayback:cdx-count-error", { url, status: cdxCountResponse.status });
        rateLimited = true;
      }
    } catch (cdxCountErr) {
      log.warn("wayback:cdx-count-fetch-error", {
        url,
        error: cdxCountErr instanceof Error ? cdxCountErr.message : String(cdxCountErr),
      });
      rateLimited = true;
    }

    // Threshold: 10 pages = ~50 snapshots
    // Below this, fetch precise count with timestamps
    // Above this, return estimate immediately (skip slow timestamp queries)
    const PRECISE_THRESHOLD = 10;
    const isSmallArchive = pageCount > 0 && pageCount <= PRECISE_THRESHOLD;

    if (pageCount > 0 && !rateLimited) {
      if (isSmallArchive) {
        // Small archive: fetch all timestamps for precise count and dates
        log.log("wayback:precise-fetch-start", { url, pageCount });
        try {
          const preciseUrl = `${WAYBACK_BASE_URL}/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&fl=timestamp&collapse=timestamp:8`;
          const preciseResponse = await fetchWithTimeoutAndRetry(preciseUrl);
          if (preciseResponse.ok) {
            const preciseData = await preciseResponse.json();
            if (Array.isArray(preciseData) && preciseData.length > 1) {
              // First row is header, so subtract 1
              snapshotCount = Math.max(0, preciseData.length - 1);
              if (snapshotCount > 0) {
                firstTimestamp = preciseData[1]?.[0];
                lastTimestamp = preciseData[preciseData.length - 1]?.[0];
              }
              isEstimate = false;
              log.log("wayback:precise-fetch-success", { url, snapshotCount, firstTimestamp, lastTimestamp });
            }
          }
        } catch (preciseErr) {
          const isTimeout = preciseErr instanceof Error && preciseErr.name === "AbortError";
          log.warn("wayback:precise-fetch-error", {
            url,
            error: preciseErr instanceof Error ? preciseErr.message : String(preciseErr),
            isTimeout,
          });
          // Fall back to estimate
          snapshotCount = pageCount * 5000;
          isEstimate = true;
        }
      } else {
        // Large archive: return estimate immediately, skip slow timestamp queries
        // CDX API pages contain ~5000 results each by default
        snapshotCount = pageCount * 5000;
        isEstimate = true;
        log.log("wayback:large-archive-estimate", { url, pageCount, estimatedSnapshots: snapshotCount });

        // For very large archives (1000+ pages = 5M+ snapshots), skip timestamp fetch entirely
        // It's too slow and the user just wants to know there's a lot of history
        if (pageCount < 1000) {
          // Medium archive: fetch first timestamp only (skip slow reverse-sort for last)
          try {
            const firstUrl = `${WAYBACK_BASE_URL}/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&fl=timestamp&limit=1`;
            log.log("wayback:cdx-first-start", { url });
            const firstResponse = await fetchWithTimeoutAndRetry(firstUrl);
            if (firstResponse.ok) {
              const firstData = await firstResponse.json();
              if (Array.isArray(firstData) && firstData.length > 1) {
                firstTimestamp = firstData[1]?.[0];
                log.log("wayback:cdx-first-success", { url, firstTimestamp });
              }
            }
          } catch (timestampErr) {
            log.warn("wayback:cdx-first-error", {
              url,
              error: timestampErr instanceof Error ? timestampErr.message : String(timestampErr),
            });
          }
        } else {
          log.log("wayback:skip-timestamp-fetch", { url, pageCount, reason: "very large archive" });
        }
      }
    }

    const result: HistoryData = {
      waybackMachineSnapshots: snapshotCount,
      isEstimate,
      firstSeen: firstTimestamp ? formatWaybackDate(firstTimestamp) : undefined,
      lastSeen: lastTimestamp ? formatWaybackDate(lastTimestamp) : undefined,
      archiveUrl: `${WAYBACK_BASE_URL}/web/*/${url}`,
      rateLimited,
    };
    log.log("wayback:success", {
      url,
      snapshotCount,
      isEstimate,
      firstSeen: result.firstSeen,
      lastSeen: result.lastSeen,
      rateLimited,
    });
    return result;
  } catch (err) {
    log.warn("wayback:error", { url, error: err instanceof Error ? err.message : String(err) });
    return undefined;
  }
}

function formatWaybackDate(timestamp: string): string {
  // Wayback timestamps are in format: YYYYMMDDhhmmss
  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(4, 6);
  const day = timestamp.substring(6, 8);
  return `${year}-${month}-${day}`;
}
