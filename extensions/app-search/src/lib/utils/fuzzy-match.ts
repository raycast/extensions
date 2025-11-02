/**
 * Fuzzy matching utilities for application search
 */

import { Application } from "@raycast/api";
import { AppSearchResult, MatchScore } from "../../types";
import {
  checkExactMatch,
  checkWordMatch,
  checkPrefixMatch,
  checkContainsMatch,
  checkAcronymMatch,
} from "./fuzzy-match-helpers";

/**
 * Normalize a string for matching
 */
export function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, " "); // normalize multiple spaces
}

/**
 * Calculate match score between target and query
 */
export function calculateMatchScore(target: string, query: string): MatchScore {
  const normalizedTarget = normalizeString(target);
  const normalizedQuery = normalizeString(query);

  // Empty query
  if (!normalizedQuery) {
    return { score: 0, reason: "contains" };
  }

  // Try each matching strategy in order of priority
  const exactMatch = checkExactMatch(normalizedTarget, normalizedQuery);
  if (exactMatch) {
    return exactMatch;
  }

  const wordMatch = checkWordMatch(normalizedTarget, normalizedQuery);
  if (wordMatch) {
    return wordMatch;
  }

  const prefixMatch = checkPrefixMatch(normalizedTarget, normalizedQuery);
  if (prefixMatch) {
    return prefixMatch;
  }

  const containsMatch = checkContainsMatch(normalizedTarget, normalizedQuery);
  if (containsMatch) {
    return containsMatch;
  }

  const acronymMatch = checkAcronymMatch(normalizedTarget, normalizedQuery);
  if (acronymMatch) {
    return acronymMatch;
  }

  // No match
  return { score: 0, reason: "contains" };
}

/**
 * Fuzzy match applications against a query
 */
export function fuzzyMatch(
  apps: Pick<Application, "name" | "bundleId">[],
  query: string,
  minScore: number = 35,
): AppSearchResult[] {
  if (!query) {
    return [];
  }

  const results: AppSearchResult[] = [];

  for (const app of apps) {
    // Match against app name
    const nameMatch = calculateMatchScore(app.name, query);

    // Match against bundleId
    const bundleIdMatch = app.bundleId
      ? calculateMatchScore(app.bundleId, query)
      : { score: 0, reason: "contains" as const };

    // Use the best score
    const bestScore = nameMatch.score > bundleIdMatch.score ? nameMatch : bundleIdMatch;

    if (bestScore.score >= minScore) {
      results.push({
        app: app as Application,
        matchScore: bestScore.score,
        matchReason:
          bestScore.reason === "exact"
            ? "Exact match"
            : bestScore.reason === "prefix"
              ? "Prefix match"
              : bestScore.reason === "bundleId"
                ? "Bundle ID match"
                : "Contains match",
      });
    }
  }

  // Sort by score (highest first)
  return results.sort((a, b) => b.matchScore - a.matchScore);
}
