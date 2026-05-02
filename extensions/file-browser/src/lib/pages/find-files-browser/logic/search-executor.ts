/**
 * @module search-executor
 *
 * Executes a validated {@link FindFilesSearchArtifact} against the native
 * search bridge. No heuristic fallback, no timeout/maxResults passthrough,
 * no hardcoded scope overrides. The artifact pipeline (generation +
 * validation) must succeed before this module is called.
 */

import { execSearchItems } from "$lib/ray-fb";
import { logSearchDebug } from "$lib/search-debug";
import { dirname, resolve } from "node:path";
import { normalizeFindFilesScopeMode, type FindFilesSearchArtifact } from "./types";

// ── Result types ──

export interface SearchExecutionResult {
  artifact: FindFilesSearchArtifact;
  paths: string[];
  isTruncated: boolean;
  isTimedOut: boolean;
}

export class SearchExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchExecutionError";
  }
}

function isDirectChildOfScope(pathname: string, scopePath: string): boolean {
  return dirname(resolve(pathname)) === resolve(scopePath);
}

function filterDirectChildren(paths: string[], scopePath: string): string[] {
  return paths.filter((pathname) => isDirectChildOfScope(pathname, scopePath));
}

// ── Public API ──

/**
 * Execute a validated search artifact via the native bridge.
 *
 * - Uses `artifact.scopePath` as `onlyIn` (defaults to "/" when empty).
 * - Does NOT pass `timeoutMs` or `maxResults`.
 * - Does NOT fall back to heuristics or native search on error.
 *
 * @throws {SearchExecutionError} When the native bridge fails.
 */
export async function executeSearchWithArtifact(artifact: FindFilesSearchArtifact): Promise<SearchExecutionResult> {
  const scopePath = artifact.scopePath.trim();
  const onlyIn = scopePath || "/";
  const scopeMode = normalizeFindFilesScopeMode(artifact.scopeMode);
  const shouldFilterDirectChildren = scopeMode === "direct" && scopePath.length > 0;

  logSearchDebug("executeSearchWithArtifact:start", {
    predicate: artifact.predicate,
    scopePath,
    scopeMode,
    onlyIn,
  });

  try {
    const searchResult = await execSearchItems({
      onlyIn,
      predicate: artifact.predicate,
    });

    const filteredPaths = shouldFilterDirectChildren
      ? filterDirectChildren(searchResult.paths, scopePath)
      : searchResult.paths;

    logSearchDebug("executeSearchWithArtifact:result", {
      pathCount: searchResult.paths.length,
      filteredPathCount: filteredPaths.length,
      directFilterApplied: shouldFilterDirectChildren,
      isTruncated: searchResult.isTruncated,
      isTimedOut: searchResult.isTimedOut,
    });

    return {
      artifact,
      paths: filteredPaths,
      isTruncated: searchResult.isTruncated,
      isTimedOut: searchResult.isTimedOut,
    };
  } catch (bridgeError) {
    const reason = bridgeError instanceof Error ? bridgeError.message : "Search execution failed";
    logSearchDebug("executeSearchWithArtifact:bridge-error", {
      predicate: artifact.predicate,
      error: reason,
    });
    throw new SearchExecutionError(reason);
  }
}
