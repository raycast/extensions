// types/index.ts

/**
 * Common type definitions for the WebBites Raycast extension
 */

/**
 * Interface for search filters
 */
export interface SearchFilters {
  // Add specific filter types as needed
  [key: string]: string | number | boolean | null;
}

/**
 * Interface representing a bookmark item
 */
export interface BookmarkItem {
  objectId: string;
  siteTitle: string;
  url: string;
  createdAt: Date;
  description?: string;
  textNote?: string;
  siteScreenshot?: { url: string };
  OGImage?: string;
  siteLogo?: string;
  type?: string;
  title?: string;
}

/**
 * Interface for search options
 */
export interface SearchOptions {
  searchTerm?: string | null;
  filters?: SearchFilters | null;
  orderBy?: string;
  page?: number;
  hitsPerPage?: number;
}

/**
 * Interface for search results
 */
export interface SearchResult {
  hits: BookmarkItem[];
  totalHits: number;
  page: number;
}

/**
 * Interface for user data
 */
export interface UserData {
  objectId: string;
  username: string;
  email: string;
  _sessionToken?: string;
  createdAt?: Date;
  [key: string]: string | Date | undefined;
}
