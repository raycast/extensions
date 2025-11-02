/**
 * Helper functions for app search
 */

import { Application } from "@raycast/api";
import { AppSearchResult } from "../../types";
import { fuzzyMatch } from "../utils/fuzzy-match";
import { QueryInterpretation } from "../ai/query-interpreter";
import { getCommonAppsForQuery } from "../data/app-database";

/**
 * Merge additional search results from AI-suggested search terms
 */
export function mergeAISearchTermResults(
  existingResults: AppSearchResult[],
  apps: Application[],
  interpretation: QueryInterpretation,
  originalQuery: string,
): AppSearchResult[] {
  const results = [...existingResults];

  if (!interpretation.searchTerms.length) {
    return results;
  }

  for (const term of interpretation.searchTerms) {
    if (term.toLowerCase() === originalQuery.toLowerCase()) {
      continue;
    }

    const additionalResults = fuzzyMatch(apps, term);

    for (const result of additionalResults) {
      const isDuplicate = results.some((r) => r.app.bundleId === result.app.bundleId);
      if (!isDuplicate) {
        results.push({
          ...result,
          matchScore: Math.max(result.matchScore - 5, 0),
          matchReason: "AI suggested",
        });
      }
    }
  }

  return results;
}

/**
 * Boost scores for AI-suggested apps that are already in results
 */
export function boostAISuggestedApps(results: AppSearchResult[], suggestedAppNames: string[]): AppSearchResult[] {
  return results.map((result) => {
    const isAISuggested = suggestedAppNames.some((name) => result.app.name.toLowerCase().includes(name.toLowerCase()));

    if (isAISuggested && result.matchScore < 95) {
      return {
        ...result,
        matchScore: Math.min(result.matchScore + 15, 98),
        matchReason: "AI recommended",
      };
    }

    return result;
  });
}

/**
 * Add AI-suggested apps that weren't found by fuzzy match
 */
export function addMissingAISuggestedApps(
  results: AppSearchResult[],
  apps: Application[],
  suggestedAppNames: string[],
): AppSearchResult[] {
  const updatedResults = [...results];

  for (const suggestedName of suggestedAppNames) {
    const alreadyIncluded = results.some((r) => r.app.name.toLowerCase().includes(suggestedName.toLowerCase()));

    if (alreadyIncluded) {
      continue;
    }

    const matchedApp = apps.find((app) => app.name.toLowerCase().includes(suggestedName.toLowerCase()));

    if (matchedApp) {
      updatedResults.push({
        app: matchedApp,
        matchScore: 85,
        matchReason: "AI recommended",
      });
    }
  }

  return updatedResults;
}

/**
 * Boost scores for apps that match categories
 */
export function boostCategoryMatches(results: AppSearchResult[], commonAppNames: string[]): AppSearchResult[] {
  return results.map((result) => {
    const isInCategory = commonAppNames.some((appName) =>
      result.app.name.toLowerCase().includes(appName.toLowerCase()),
    );

    if (isInCategory && result.matchScore < 90) {
      return {
        ...result,
        matchScore: Math.min(result.matchScore + 10, 95),
        matchReason: "Category match",
      };
    }

    return result;
  });
}

/**
 * Add apps that match categories but weren't found by fuzzy match
 */
export function addMissingCategoryMatches(
  results: AppSearchResult[],
  apps: Application[],
  commonAppNames: string[],
): AppSearchResult[] {
  const updatedResults = [...results];

  for (const app of apps) {
    const alreadyIncluded = results.some((r) => r.app.bundleId === app.bundleId);
    if (alreadyIncluded) {
      continue;
    }

    const isInCategory = commonAppNames.some((appName) => app.name.toLowerCase().includes(appName.toLowerCase()));

    if (isInCategory) {
      updatedResults.push({
        app,
        matchScore: 70,
        matchReason: "Category match",
      });
    }
  }

  return updatedResults;
}

/**
 * Apply category-based matching to results
 */
export function applyCategoryMatching(
  results: AppSearchResult[],
  apps: Application[],
  matchedCategories: string[],
  query: string,
): AppSearchResult[] {
  if (!matchedCategories.length) {
    return results;
  }

  const commonAppNames = getCommonAppsForQuery(query);
  let updatedResults = boostCategoryMatches(results, commonAppNames);
  updatedResults = addMissingCategoryMatches(updatedResults, apps, commonAppNames);

  // Sort by score
  updatedResults.sort((a, b) => b.matchScore - a.matchScore);

  return updatedResults;
}
