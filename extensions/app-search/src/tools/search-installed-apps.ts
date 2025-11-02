/**
 * AI Tool: Search Installed Apps
 * Searches for installed applications by name, purpose, or category
 */

import { searchApps } from "../lib/apps/app-search";

type Input = {
  /**
   * Search query - can be app name, purpose, or category
   * Examples: "chrome", "browser", "mail app", "画像編集"
   */
  query: string;

  /**
   * Whether to include uninstalled app suggestions
   * Default: true (only when few matches found)
   */
  includeUninstalled?: boolean;
};

export default async function searchInstalledApps(input: Input) {
  const { query, includeUninstalled = true } = input;

  // Perform search
  const results = await searchApps(query, includeUninstalled);

  // Format results for AI
  return {
    query,
    installed: results.installed.map((result) => ({
      name: result.app.name,
      bundleId: result.app.bundleId,
      path: result.app.path,
      matchScore: result.matchScore,
      matchReason: result.matchReason,
    })),
    suggestions: results.suggestions,
    summary: `Found ${results.installed.length} installed app(s)${
      results.suggestions.length > 0 ? ` and ${results.suggestions.length} suggestion(s)` : ""
    }`,
  };
}
