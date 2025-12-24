/**
 * Type definitions for Context7 API integration
 */

/**
 * Represents a library returned from Context7's search API
 */
export interface LibrarySearchResult {
  /** Unique identifier in format "/{owner}/{repo}" or "/websites/{domain}" */
  id: string;

  /** Display name of the library */
  title: string;

  /** Brief description of the library's purpose */
  description: string;

  /** Git branch for documentation source */
  branch: string;

  /** ISO 8601 timestamp of last documentation update */
  lastUpdateDate: string;

  /** Documentation processing state (e.g., "finalized") */
  state: string;

  /** Total tokens in documentation */
  totalTokens: number;

  /** Number of code snippets indexed */
  totalSnippets: number;

  /** GitHub stars count (-1 if not from GitHub) */
  stars: number;

  /** Context7 trust score (0-10 scale) */
  trustScore: number;

  /** Context7 benchmark score for documentation quality */
  benchmarkScore: number;

  /** Available version tags */
  versions: string[];
}

/**
 * Wrapper for search API response
 */
export interface SearchResponse {
  results: LibrarySearchResult[];
}

/**
 * User-configurable settings stored by Raycast
 */
export interface Preferences {
  /** Optional Context7 API Key for higher rate limits */
  apiKey?: string;

  /** Default token limit for documentation (default: 10000) */
  defaultTokens?: string;
}

/**
 * Standardized error structure for API failures
 */
export interface APIError {
  /** HTTP status code or -1 for network errors */
  status: number;

  /** User-friendly error message */
  message: string;

  /** Whether user should be directed to preferences */
  showPreferencesLink: boolean;
}
