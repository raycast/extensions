/**
 * @module search-dedupe
 *
 * In-flight deduplication for expensive search operations in the find-files
 * pipeline. Concurrent identical work shares a single promise; once that
 * promise settles the entry is removed — there is no persistent result cache.
 *
 * Dedupe keys deliberately exclude sort, showHidden, and view mode because
 * those concerns are orthogonal to the expensive AI-generation and native-
 * search work being deduped here.
 */

import type { ArtifactGenerationOutcome } from "./ai-artifact-generator";
import type { SearchExecutionResult } from "./search-executor";

type DedupeKey = string;

const inFlightArtifactGenerations = new Map<DedupeKey, Promise<ArtifactGenerationOutcome>>();
const inFlightSearchExecutions = new Map<DedupeKey, Promise<SearchExecutionResult>>();

function makeArtifactKey(query: string): DedupeKey {
  return `artifact:${query.trim().toLowerCase()}`;
}

function makeSearchKey(predicate: string, scopePath: string): DedupeKey {
  return `search:${predicate}:${scopePath}`;
}

/**
 * Deduplicate concurrent AI artifact generation for the same query.
 * If a generation is already in-flight for this query, return the same promise.
 * Once the promise settles, remove it from the map (no persistent cache).
 */
export async function dedupedGenerateArtifact(
  query: string,
  generator: () => Promise<ArtifactGenerationOutcome>,
): Promise<ArtifactGenerationOutcome> {
  const key = makeArtifactKey(query);
  const existing = inFlightArtifactGenerations.get(key);
  if (existing) return existing;

  const promise = generator().finally(() => {
    inFlightArtifactGenerations.delete(key);
  });
  inFlightArtifactGenerations.set(key, promise);
  return promise;
}

/**
 * Deduplicate concurrent search executions for the same predicate + scope.
 * If a search is already in-flight for this key, return the same promise.
 * Once the promise settles, remove it from the map (no persistent cache).
 */
export async function dedupedExecuteSearch(
  predicate: string,
  scopePath: string,
  executor: () => Promise<SearchExecutionResult>,
): Promise<SearchExecutionResult> {
  const key = makeSearchKey(predicate, scopePath);
  const existing = inFlightSearchExecutions.get(key);
  if (existing) return existing;

  const promise = executor().finally(() => {
    inFlightSearchExecutions.delete(key);
  });
  inFlightSearchExecutions.set(key, promise);
  return promise;
}

/**
 * Clear all in-flight entries. Primarily useful for testing.
 */
export function clearInFlight(): void {
  inFlightArtifactGenerations.clear();
  inFlightSearchExecutions.clear();
}
