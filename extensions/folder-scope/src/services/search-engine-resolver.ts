import type { EngineChoice } from "../types/preferences.ts";
import type { SearchCompletion, SearchEngine, SearchEngineType, SearchError, SearchRequest } from "../types/search.ts";

/** UI labels required by the PRD for the active-engine indicator. */
export const ENGINE_LABELS: Record<SearchEngineType, string> = {
  "bundled-ripgrep": "Bundled ripgrep",
  "system-ripgrep": "System ripgrep",
  "node-fallback": "Node.js fallback",
};

const FULL_CHAIN: SearchEngineType[] = ["bundled-ripgrep", "system-ripgrep", "node-fallback"];

/**
 * Product decision: an explicit engine preference starts the fallback chain at
 * that engine and still falls back downward, so a search always runs — the
 * skipped/failed engines are surfaced to the UI via `failures`. Automatic
 * starts at the top of the chain.
 */
export function engineChain(preference: EngineChoice): SearchEngineType[] {
  switch (preference) {
    case "automatic":
    case "bundled":
      return [...FULL_CHAIN];
    case "system":
      return ["system-ripgrep", "node-fallback"];
    case "node":
      return ["node-fallback"];
  }
}

export interface EngineFailure {
  engine: SearchEngineType;
  error: SearchError;
}

/** Completion plus the UI-facing resolution info: which engine ran and why others were skipped. */
export interface ResolvedSearchCompletion extends SearchCompletion {
  engine: SearchEngineType;
  /** Engines tried before the one that ran; empty when the first choice worked. */
  failures: EngineFailure[];
}

function isSearchError(error: unknown): error is SearchError {
  return typeof error === "object" && error !== null && "kind" in error && "message" in error;
}

/**
 * Separates the two fallback situations:
 * - Could not start (`engine-unavailable`, `engine-startup-failed`): always try
 *   the next engine.
 * - Failed mid-search (`engine-crashed`, `unexpected`): try the next engine
 *   only when the failing engine emitted nothing, so partial output from one
 *   engine never mixes with the next engine's results.
 * - `invalid-query` and `directory-inaccessible` are user/environment errors —
 *   no engine would do better, so they propagate immediately.
 */
function canFallBack(error: SearchError, emitted: number): boolean {
  if (error.kind === "engine-unavailable" || error.kind === "engine-startup-failed") return true;
  return (error.kind === "engine-crashed" || error.kind === "unexpected") && emitted === 0;
}

/**
 * Runs the search on the first engine in `engines` that works, falling back
 * per `canFallBack`. Late emissions from a failed engine are dropped, so the
 * caller only ever sees results from the engine named in the returned
 * completion (plus valid partial output when the final engine fails mid-search
 * and the error is rethrown).
 */
export async function searchWithFallback(
  request: SearchRequest,
  engines: SearchEngine[],
): Promise<ResolvedSearchCompletion> {
  const failures: EngineFailure[] = [];
  for (let index = 0; index < engines.length; index++) {
    const engine = engines[index];
    if (request.signal.aborted) return { limitReached: false, cancelled: true, engine: engine.type, failures };

    let emitted = 0;
    let active = true;
    try {
      const completion = await engine.search({
        ...request,
        onResults: (batch) => {
          if (!active || batch.length === 0) return;
          emitted += batch.length;
          request.onResults(batch);
        },
      });
      return { ...completion, engine: engine.type, failures };
    } catch (error) {
      active = false; // A failed engine must never leak late results into the next engine's output.
      const failure: SearchError = isSearchError(error)
        ? error
        : { kind: "unexpected", message: error instanceof Error ? error.message : String(error) };
      failures.push({ engine: engine.type, error: failure });
      if (index + 1 >= engines.length || !canFallBack(failure, emitted)) throw failure;
    }
  }
  // engineChain never returns an empty list; defensive for direct callers.
  const noEngine: SearchError = { kind: "engine-unavailable", message: "No search engine is available." };
  throw noEngine;
}
