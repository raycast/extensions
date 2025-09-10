/**
 * Type definitions for the BopLink extension
 */

/**
 * Represents a streaming platform with its metadata
 */
export interface Platform {
  /** Unique identifier for the platform */
  id: string;
  /** Display name of the platform */
  name: string;
  /** URL patterns that identify this platform */
  urlPatterns: RegExp[];
  /** Path to the platform's icon */
  icon?: string;
}

/**
 * Represents a converted link result from song.link
 */
export interface ConvertedLink {
  /** The platform this link is for */
  platform: Platform;
  /** The actual URL to the content on this platform */
  url: string;
}

/**
 * Types of content that can be converted
 */
export type ContentType = "music" | "podcast";

/**
 * Represents the result from scraping song.link
 */
export interface ScrapeResult {
  /** Successfully converted links */
  links: ConvertedLink[];
  /** Error message if scraping failed */
  error?: string;
  /** Metadata about the content */
  metadata?: {
    title?: string;
    type?: string; // 'track', 'album', 'playlist', 'podcast'
  };
}
