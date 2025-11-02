/**
 * Main application search logic
 */

import { getApplications } from "@raycast/api";
import { SearchResults, AppSuggestion } from "../../types";
import { fuzzyMatch } from "../utils/fuzzy-match";
import { findMatchingCategories, APP_CATEGORIES, getSearchUrl } from "../data/app-database";
import { interpretQuery } from "../ai/query-interpreter";
import {
  mergeAISearchTermResults,
  boostAISuggestedApps,
  addMissingAISuggestedApps,
  applyCategoryMatching,
} from "./app-search-helpers";

/**
 * Get matched categories from AI interpretation or fallback
 */
function getMatchedCategories(
  interpretation: Awaited<ReturnType<typeof interpretQuery>> | null,
  query: string,
): string[] {
  if (interpretation && interpretation.suggestedCategories.length > 0) {
    return interpretation.suggestedCategories;
  }
  return findMatchingCategories(query);
}

/**
 * Search for applications based on query (with AI interpretation)
 */
export async function searchApps(
  query: string,
  includeUninstalled: boolean = true,
  useAI: boolean = true,
): Promise<SearchResults> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return { installed: [], suggestions: [] };
  }

  try {
    const apps = await getApplications();

    // Use AI to interpret query if enabled
    const interpretation = useAI && trimmedQuery.length > 2 ? await interpretQuery(trimmedQuery, apps) : null;

    if (interpretation) {
      console.log("AI interpretation:", interpretation);
    }

    // Perform initial fuzzy matching
    let installedResults = fuzzyMatch(apps, trimmedQuery);

    // Merge AI search term results
    if (interpretation) {
      installedResults = mergeAISearchTermResults(installedResults, apps, interpretation, trimmedQuery);
    }

    // Boost and add AI-suggested apps
    if (interpretation?.suggestedAppNames.length) {
      installedResults = boostAISuggestedApps(installedResults, interpretation.suggestedAppNames);
      installedResults = addMissingAISuggestedApps(installedResults, apps, interpretation.suggestedAppNames);
    }

    // Apply category-based matching
    const matchedCategories = getMatchedCategories(interpretation, trimmedQuery);
    installedResults = applyCategoryMatching(installedResults, apps, matchedCategories, trimmedQuery);

    // Final sort by score
    installedResults.sort((a, b) => b.matchScore - a.matchScore);

    // Generate suggestions if needed
    const suggestions =
      includeUninstalled && installedResults.length < 3
        ? getSuggestions(
            trimmedQuery,
            installedResults.map((r) => r.app.name),
          )
        : [];

    return {
      installed: installedResults,
      suggestions,
    };
  } catch (error) {
    console.error("Error searching apps:", error);
    return { installed: [], suggestions: [] };
  }
}

/**
 * Generate app suggestions based on query
 */
function getSuggestions(query: string, installedAppNames: string[]): AppSuggestion[] {
  const suggestions: AppSuggestion[] = [];
  const matchedCategories = findMatchingCategories(query);

  // Add suggestions from matched categories
  for (const categoryId of matchedCategories) {
    const category = APP_CATEGORIES[categoryId];
    if (!category) {
      continue;
    }

    for (const appName of category.commonApps) {
      // Skip if already installed
      if (installedAppNames.some((installed) => installed.toLowerCase().includes(appName.toLowerCase()))) {
        continue;
      }

      // Skip if already in suggestions
      if (suggestions.some((s) => s.name === appName)) {
        continue;
      }

      suggestions.push({
        name: appName,
        category: category.description || categoryId,
        description: `Popular ${category.description?.toLowerCase() || categoryId}`,
        searchUrl: getSearchUrl(appName),
      });

      // Limit suggestions
      if (suggestions.length >= 5) {
        break;
      }
    }

    if (suggestions.length >= 5) {
      break;
    }
  }

  return suggestions;
}
