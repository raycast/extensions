/**
 * Scans source roots for Tesla clip events and enriches them with merge readiness.
 *
 * @module hooks/use-clip-scanner
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { enrichEventsWithReadiness, enrichScanResultWithReadiness } from "../lib/merge-readiness";
import { logger } from "../lib/logger";
import { scanRoot } from "../lib/scanner";
import type { ScanResult, TeslaEvent } from "../types";

type PendingRefresh = {
  readonly token: number;
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
};

/** Return value of {@link useClipScanner}. */
type UseClipScannerResult = {
  readonly events: TeslaEvent[];
  readonly isLoading: boolean;
  readonly lastError: string | undefined;
  readonly scanSummary: ScanResult | undefined;
  readonly refresh: () => Promise<void>;
};

/**
 * Scans Tesla clip folders under the given roots and keeps state in sync with refresh requests.
 *
 * @param roots - Absolute paths to source folders containing event directories.
 * @param outputRootPath - Optional custom output root for merge readiness checks.
 * @returns Scan state: `events`, `isLoading`, `lastError`, `scanSummary`, and `refresh()` promise.
 */
export function useClipScanner(roots: string[], outputRootPath?: string): UseClipScannerResult {
  const [events, setEvents] = useState<TeslaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | undefined>();
  const [scanSummary, setScanSummary] = useState<ScanResult | undefined>();
  const [refreshToken, setRefreshToken] = useState(0);
  const refreshTokenRef = useRef(refreshToken);
  refreshTokenRef.current = refreshToken;
  const previousEventsRef = useRef<TeslaEvent[]>([]);
  const pendingRefreshRef = useRef<PendingRefresh | null>(null);

  const resolvePendingRefresh = useCallback((token: number): void => {
    const pending = pendingRefreshRef.current;
    if (pending && pending.token === token) {
      pending.resolve();
      pendingRefreshRef.current = null;
    }
  }, []);

  const rejectPendingRefresh = useCallback((token: number, error: Error): void => {
    const pending = pendingRefreshRef.current;
    if (pending && pending.token === token) {
      pending.reject(error);
      pendingRefreshRef.current = null;
    }
  }, []);

  const refresh = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      const pending = pendingRefreshRef.current;
      if (pending) {
        pending.reject(new Error("Refresh superseded"));
        pendingRefreshRef.current = null;
      }

      const next = refreshTokenRef.current + 1;
      pendingRefreshRef.current = { token: next, resolve, reject };
      setRefreshToken(next);
    });
  }, []);

  useEffect(() => {
    if (roots.length === 0) {
      logger.debug("No roots to scan, clearing state");
      setEvents([]);
      setScanSummary(undefined);
      setLastError(undefined);
      setIsLoading(false);
      resolvePendingRefresh(refreshToken);
      return;
    }

    let cancelled = false;
    const scanToken = refreshToken;

    async function scan(): Promise<void> {
      setIsLoading(true);
      setLastError(undefined);
      logger.info("Starting clip scan", { rootCount: roots.length, roots, outputRootPath });

      try {
        const allEvents: TeslaEvent[] = [];
        let totalEvents = 0;
        let totalCameras = 0;
        let totalSegments = 0;
        let totalGaps = 0;

        for (const root of roots) {
          logger.debug("Scanning root", { root });
          const result = await scanRoot(root);
          if (cancelled) {
            logger.debug("Scan cancelled mid-root");
            return;
          }
          logger.debug("Root scanned", {
            root,
            events: result.totalEvents,
            cameras: result.totalCameras,
            segments: result.totalSegments,
            gaps: result.totalGaps,
          });
          allEvents.push(...result.events);
          totalEvents += result.totalEvents;
          totalCameras += result.totalCameras;
          totalSegments += result.totalSegments;
          totalGaps += result.totalGaps;
        }

        if (cancelled) {
          logger.debug("Scan cancelled after all roots");
          return;
        }

        const enrichedEvents = await enrichEventsWithReadiness(allEvents, outputRootPath);
        const combined = enrichScanResultWithReadiness(
          {
            events: enrichedEvents,
            totalEvents,
            totalCameras,
            totalSegments,
            totalGaps,
          },
          enrichedEvents,
        );

        logger.info("Clip scan completed", {
          totalEvents,
          totalCameras,
          totalSegments,
          totalGaps,
          totalExistingEvents: combined.totalExistingEvents,
          totalPartialExistingEvents: combined.totalPartialExistingEvents,
        });

        setEvents(enrichedEvents);
        setScanSummary(combined);
        previousEventsRef.current = enrichedEvents;
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        logger.error("Clip scan failed", { error: message });
        setLastError(message);
        setEvents(previousEventsRef.current);
        rejectPendingRefresh(scanToken, error instanceof Error ? error : new Error(message));
        await showToast({
          style: Toast.Style.Failure,
          title: "Scan failed",
          message,
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          resolvePendingRefresh(scanToken);
        }
      }
    }

    void scan();

    return () => {
      cancelled = true;
    };
  }, [outputRootPath, refreshToken, rejectPendingRefresh, resolvePendingRefresh, roots]);

  return { events, isLoading, lastError, scanSummary, refresh };
}
