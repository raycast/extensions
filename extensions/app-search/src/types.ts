/**
 * Type definitions for Search App extension
 */

import { Application } from "@raycast/api";

/**
 * Application search result from installed apps
 */
export interface AppSearchResult {
  app: Application;
  matchScore: number;
  matchReason: string;
}

/**
 * Suggestion for uninstalled applications
 */
export interface AppSuggestion {
  name: string;
  category: string;
  description: string;
  searchUrl: string;
  officialUrl?: string;
}

/**
 * Combined search results
 */
export interface SearchResults {
  installed: AppSearchResult[];
  suggestions: AppSuggestion[];
}

/**
 * Application category definition
 */
export interface AppCategory {
  keywords: string[];
  commonApps: string[];
  description?: string;
}

/**
 * Match score breakdown
 */
export interface MatchScore {
  score: number;
  reason: "exact" | "prefix" | "contains" | "bundleId" | "category" | "purpose";
}
