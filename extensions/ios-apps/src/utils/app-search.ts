// App search and ranking utility functions
import type { ITunesResult, IpaToolSearchApp } from "../types";
import { searchITunesApps } from "./itunes-api";
import { logger } from "./logger";

/**
 * Filter iTunes apps based on relevance to the query
 * @param apps List of iTunes app results
 * @param query User search query
 * @returns Filtered list of relevant apps
 */
export function filterRelevantApps(apps: ITunesResult[], query: string): ITunesResult[] {
  const normalizedQuery = query.toLowerCase();

  return apps.filter((app: ITunesResult) => {
    const name = (app.trackName || "").toLowerCase();
    const developer = (app.artistName || "").toLowerCase();

    // Include apps that match the query in name or developer
    return (
      name.includes(normalizedQuery) ||
      developer.includes(normalizedQuery) ||
      name.startsWith(normalizedQuery) ||
      normalizedQuery.includes(name)
    );
  });
}

/**
 * Confirm app selection by disambiguating between multiple results
 */
export async function confirmAppSelection(query: string, bundleId?: string) {
  logger.log(`[confirmation utility] Checking for disambiguation for: "${query}"`);

  if (bundleId) {
    return undefined;
  }

  try {
    const searchResults = await searchITunesApps(query, 10);

    if (searchResults.length === 0) {
      return undefined;
    }

    const sortedApps = filterAndSortApps(searchResults, query);

    if (sortedApps.length <= 1) {
      return undefined;
    }

    logger.log(`[confirmation utility] Multiple popular apps found, requiring confirmation.`);

    const topMatches = sortedApps.slice(0, 6);
    const bestMatch = topMatches[0];

    return {
      message: `Found multiple apps matching "${query}". Proceed with "${bestMatch.trackName}" (most popular)?`,
      info: topMatches.map((app: ITunesResult, index: number) => ({
        name: `Option ${index + 1}`,
        value: `${app.trackName} by ${app.artistName}`,
      })),
    };
  } catch (error) {
    logger.error(`[confirmation utility] Error during disambiguation check: ${error}`);
    return undefined;
  }
}

/**
 * Compare function for sorting iTunes apps by popularity and relevance
 * @param a First app to compare
 * @param b Second app to compare
 * @returns Comparison result for sorting
 */
export function compareApps(a: ITunesResult, b: ITunesResult): number {
  // Primary sort: rating count (higher = more popular)
  if (b.userRatingCount !== a.userRatingCount) {
    return b.userRatingCount - a.userRatingCount;
  }
  // Secondary sort: average rating
  if (b.averageUserRating !== a.averageUserRating) {
    return b.averageUserRating - a.averageUserRating;
  }
  // Tertiary sort: name length (shorter = more likely to be main app)
  return a.trackName.length - b.trackName.length;
}

/**
 * Filter and sort iTunes apps by relevance and popularity
 * @param apps List of iTunes app results
 * @param query User search query
 * @returns Filtered and sorted list of relevant apps
 */
export function filterAndSortApps(apps: ITunesResult[], query: string): ITunesResult[] {
  const relevantApps = filterRelevantApps(apps, query);
  return relevantApps.sort(compareApps);
}

/**
 * Score-based relevance calculation for ipatool search results
 * This is used for tools that work with ipatool results instead of iTunes API results
 * @param apps List of ipatool search results
 * @param query User search query
 * @returns Apps with relevance scores, sorted by score (highest first)
 */
export function scoreAndSortIpaToolApps(
  apps: IpaToolSearchApp[],
  query: string,
): Array<{ app: IpaToolSearchApp; score: number }> {
  const normalizedQuery = query.toLowerCase();

  const scoredResults = apps.map((app) => {
    const name = (app.name || "").toLowerCase();
    const developer = (app.developer || "").toLowerCase();
    let score = 0;

    // Exact name match gets highest score
    if (name === normalizedQuery) {
      score += 100;
    }
    // Name starts with query
    else if (name.startsWith(normalizedQuery)) {
      score += 75;
    }
    // Query is contained in name
    else if (name.includes(normalizedQuery)) {
      score += 50;
    }

    // Developer name matches or contains query
    if (developer === normalizedQuery) {
      score += 30;
    } else if (developer.includes(normalizedQuery)) {
      score += 20;
    }

    // Prefer shorter names when scores are similar (likely more precise matches)
    // Use normalized penalty with max cap to prevent negative scores
    const lengthPenalty = Math.min(name.length * 0.1, 10); // Cap penalty at 10 points
    score -= lengthPenalty;

    return { app, score };
  });

  // Sort by score (highest first)
  return scoredResults.sort((a, b) => b.score - a.score);
}

/**
 * Get the best matching app from ipatool search results
 * @param apps List of ipatool search results
 * @param query User search query
 * @returns Best matching app, or undefined if no apps provided
 */
export function getBestIpaToolMatch(apps: IpaToolSearchApp[], query: string): IpaToolSearchApp | undefined {
  if (apps.length === 0) {
    return undefined;
  }

  const scoredResults = scoreAndSortIpaToolApps(apps, query);
  return scoredResults[0].app;
}

/**
 * Check if an app name is an exact match for the query
 * @param appName App name to check
 * @param query User search query
 * @returns True if exact match
 */
export function isExactMatch(appName: string, query: string): boolean {
  return appName.toLowerCase() === query.toLowerCase();
}

/**
 * Check if the top app is significantly more popular than others
 * @param topApp Most popular app
 * @param secondApp Second most popular app
 * @param multiplier Popularity multiplier threshold (default: 10x)
 * @returns True if significantly more popular
 */
export function isSignificantlyMorePopular(
  topApp: ITunesResult,
  secondApp: ITunesResult,
  multiplier: number = 10,
): boolean {
  return topApp.userRatingCount > secondApp.userRatingCount * multiplier;
}
