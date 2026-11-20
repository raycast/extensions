import { useEffect, useRef } from "react";
import { Entry } from "./types";
import { rowIdForEntry } from "./entry-identity";
import {
  traceNavigation,
  traceNavigationAfterRelease,
} from "./navigation-diagnostics";

/** What one result view's lifecycle samples are measured over. */
export type NavigationTracingState = {
  isDevelopment: boolean;
  frameId: number;
  /** Search scope; undefined searches all indexed locations. */
  dir?: string;
  generation: number;
  query: string;
  rows: readonly { entry: Entry }[];
  selectedId: string | null | undefined;
  initialSelectionPath?: string;
  listReady: boolean;
  queryController: AbortController;
  screen: { getSearchStartedAt: () => number };
  /** How much each source contributed to this render. */
  payload: {
    children: number;
    found: number;
    cached: number;
    rendered: number;
  };
};

/**
 * Development-only lifecycle tracing for one result view.
 *
 * None of this is part of what the user sees; it exists to investigate native
 * worker memory and selection timing, so it is kept out of the render body.
 * Returns the selection-received sample, which has to fire from the event
 * handler itself, before the selection is applied.
 */
export function useNavigationTracing(
  state: NavigationTracingState,
): (id: string | null) => void {
  const {
    isDevelopment,
    frameId,
    dir,
    generation,
    query,
    rows,
    selectedId,
    initialSelectionPath,
    listReady,
    queryController,
    screen,
  } = state;
  const timedQuery = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    if (!listReady || timedQuery.current === queryController) return;
    timedQuery.current = queryController;
    traceNavigation("search-results-ready", {
      frameId,
      scope: dir ? "folder" : "global",
      queryLength: query.length,
      rows: rows.length,
      elapsedMs:
        Math.round((performance.now() - screen.getSearchStartedAt()) * 10) / 10,
    });
  }, [listReady, queryController, frameId, dir, query, rows.length, screen]);
  useEffect(() => {
    if (!isDevelopment) return;
    traceNavigation("selection-request", {
      frameId,
      generation,
      rows: rows.length,
      requestedIndex: rows.findIndex(
        ({ entry }) => rowIdForEntry(generation, entry) === selectedId,
      ),
      restoring: initialSelectionPath !== undefined,
    });
    // The restoring flag is a label on this sample, not a reason to resample.
  }, [frameId, generation, rows, selectedId]);
  const payloadRef = useRef(state.payload);
  payloadRef.current = state.payload;
  useEffect(() => {
    traceNavigation("result-view-mounted", {
      frameId,
      scope: dir === undefined ? "global" : "folder",
    });
    return () => {
      const payload = payloadRef.current;
      traceNavigation("result-view-unmounted", {
        frameId,
        scope: dir === undefined ? "global" : "folder",
        ...payload,
      });
      traceNavigationAfterRelease("result-view-released", {
        frameId,
        ...payload,
      });
    };
    // Deliberately per frame: the mount and unmount pair is the measurement.
  }, [frameId]);
  return (id: string | null) => {
    if (!isDevelopment) return;
    traceNavigation("selection-received", {
      frameId,
      generation,
      rows: rows.length,
      selectedIndex: rows.findIndex(
        ({ entry }) => rowIdForEntry(generation, entry) === id,
      ),
      requestedIndex: rows.findIndex(
        ({ entry }) => rowIdForEntry(generation, entry) === selectedId,
      ),
      empty: id === null,
    });
  };
}
