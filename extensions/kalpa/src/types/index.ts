/**
 * Kalpa Data Types
 * These types mirror the Convex schema for type-safe API interactions
 */

export interface KalpaLink {
  _id: string;
  _creationTime: number;
  url: string;
  title: string;
  domain: string;
  linkType?: "page" | "youtube" | "codepen";
  is_read: boolean;
  is_archived: boolean;
  summary_preview?: string;
  screenshot_url?: string;
  read_time_min?: number;
  // CodePen specific
  codepenSlug?: string;
  codepenUser?: string;
  codepenTitle?: string;
  codepenAuthor?: string;
  codepenThumb?: string;
  codepenEmbedUrl?: string;
  // Relations (populated by queries)
  tags?: KalpaTag[];
  universes?: KalpaUniverse[];
  videoId?: string; // YouTube video ID
}

export interface KalpaUniverse {
  _id: string;
  _creationTime: number;
  name: string;
  color: string;
  linkCount?: number;
}

export interface KalpaTag {
  _id: string;
  _creationTime: number;
  name: string;
  color: string;
  count?: number;
  confidence?: number;
}

export interface KalpaUser {
  subject: string;
  name: string | null;
  email: string | null;
  tokenIdentifier: string;
  pictureUrl: string | null;
}

// API Response Types
export interface PaginatedResponse<T> {
  page: T[];
  isDone: boolean;
  continueCursor: string;
}

export interface SaveLinkRequest {
  url: string;
  title: string;
  selection?: string;
  screenshot?: string;
  universeId?: string;
}

export interface SaveLinkResponse {
  linkId: string;
}

export interface UniversesListResponse {
  universes: KalpaUniverse[];
}

// Preferences
export interface KalpaPreferences {
  apiToken: string;
}

// Search/Filter Options
export interface LinkSearchOptions {
  search?: string;
  universeId?: string;
  tagId?: string;
  hideRead?: boolean;
  hideArchived?: boolean;
  numItems?: number;
}
