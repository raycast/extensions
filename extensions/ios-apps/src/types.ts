// src/types.ts - Type definitions for the extension
import path from "path";

// =============================================================================
// CORE APP DATA TYPES
// =============================================================================

/**
 * Main app details interface combining data from multiple sources
 */
export interface AppDetails {
  artistName: string;
  artworkUrl60: string;
  id: string;
  bundleId: string;
  name: string;
  description: string;
  iconUrl: string;
  sellerName: string;
  version: string;
  price: string;
  currency: string;
  genres: string[];
  size: string;
  contentRating: string;
  // iTunes API additional fields
  artworkUrl512: string;
  averageUserRating: number;
  averageUserRatingForCurrentVersion: number;
  userRatingCount: number;
  userRatingCountForCurrentVersion: number;
  releaseDate: string;
  currentVersionReleaseDate?: string;
  trackViewUrl?: string;
  artistViewUrl?: string;
  screenshotUrls?: string[];
  ipadScreenshotUrls?: string[];
  appletvScreenshotUrls?: string[];
  // Raw iTunes API response data
  itunesData?: {
    screenshotUrls?: string[];
    ipadScreenshotUrls?: string[];
    appletvScreenshotUrls?: string[];
    watchScreenshotUrls?: string[];

    [key: string]: unknown;
  };
}

/**
 * Version history item for app updates
 */
export interface VersionHistoryItem {
  version: string;
  releaseDate: string;
  releaseNotes: string;
}

// =============================================================================
// ITUNES API TYPES
// =============================================================================

/**
 * iTunes Search API response wrapper
 */
export interface ITunesResponse {
  resultCount: number;
  results: ITunesResult[];
}

/**
 * Complete iTunes Search API result structure
 */
export interface ITunesResult {
  artistId: number;
  artistName: string;
  artistViewUrl: string;
  artworkUrl60: string;
  artworkUrl100: string;
  artworkUrl512: string;
  averageUserRating: number;
  averageUserRatingForCurrentVersion: number;
  bundleId: string;
  contentAdvisoryRating: string;
  currency: string;
  currentVersionReleaseDate: string;
  description: string;
  features: string[];
  fileSizeBytes: number;
  formattedPrice: string;
  genreIds: string[];
  genres: string[];
  isGameCenterEnabled: boolean;
  kind: string;
  languageCodesISO2A: string[];
  minimumOsVersion: string;
  price: number;
  primaryGenreName: string;
  releaseDate: string;
  releaseNotes: string;
  // Screenshot URLs for different platforms
  screenshotUrls: string[];
  ipadScreenshotUrls: string[];
  appletvScreenshotUrls?: string[];
  watchScreenshotUrls?: string[];
  messageScreenshotUrls?: string[];
  sellerName: string;
  sellerUrl: string;
  trackCensoredName: string;
  trackContentRating: string;
  trackId: number;
  trackName: string;
  trackViewUrl: string;
  userRatingCount: number;
  userRatingCountForCurrentVersion: number;
  version: string;
  wrapperType: string;
  // Index signature to allow accessing any property
  [key: string]: unknown;
}

// =============================================================================
// IPATOOL TYPES
// =============================================================================

/**
 * ipatool search result for individual apps
 */
export interface IpaToolSearchApp {
  id: number;
  bundleId?: string;
  bundleID?: string; // Add support for both casing variants from ipatool output
  name: string;
  version: string;
  price: number;
  developer: string;
}

/**
 * ipatool search response wrapper
 */
export interface IpaToolSearchResponse {
  count: number;
  apps: IpaToolSearchApp[];
}

// =============================================================================
// PLATFORM & SCREENSHOT TYPES
// =============================================================================

/**
 * Supported Apple platforms for screenshots
 */
export type PlatformType = "iPhone" | "iPad" | "Mac" | "AppleTV" | "AppleWatch" | "VisionPro";

/**
 * Screenshot information with platform context
 */
export interface ScreenshotInfo {
  url: string;
  type: PlatformType;
  index: number;
}

/**
 * Platform preferences for screenshot downloads
 */
export interface PlatformPreferences {
  includeIPhone: boolean;
  includeIPad: boolean;
  includeMac: boolean;
  includeAppleTV: boolean;
  includeAppleWatch: boolean;
  includeVisionPro: boolean;
}

/**
 * Platform directory mapping for organizing screenshots
 */
export const PlatformDirectories = (screenshotsDir: string): Record<PlatformType, string> => ({
  iPhone: path.join(screenshotsDir, "iPhone"),
  iPad: path.join(screenshotsDir, "iPad"),
  Mac: path.join(screenshotsDir, "Mac"),
  AppleTV: path.join(screenshotsDir, "TV"),
  AppleWatch: path.join(screenshotsDir, "Apple Watch"),
  VisionPro: path.join(screenshotsDir, "Vision Pro"),
});

// =============================================================================
// EXTENSION CONFIGURATION TYPES
// =============================================================================

/**
 * Raycast extension preferences
 */
export interface ExtensionPreferences {
  appleId: string;
  password: string;
  downloadPath?: string;
  homebrewPath?: string;
  ipatoolPath?: string;
  verboseLogging?: boolean;
}
