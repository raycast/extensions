import { MUSIC_PLATFORMS, PODCAST_PLATFORMS } from "../constants/platforms";
import { Platform, ContentType } from "../types";

/**
 * Validates if a URL is from a supported streaming platform
 * and determines its content type (music or podcast)
 */
export class URLValidator {
  /**
   * Checks if the provided URL is from a supported platform
   * @param url - The URL to validate
   * @returns An object containing validation result and platform details
   */
  static validate(url: string): {
    isValid: boolean;
    platform?: Platform;
    contentType?: ContentType;
    error?: string;
  } {
    // Basic URL validation - ensure it's a valid URL format
    try {
      new URL(url);
    } catch {
      return {
        isValid: false,
        error: "Invalid URL format",
      };
    }

    // Normalize the URL (remove trailing slashes, lowercase)
    const normalizedUrl = url.trim().toLowerCase();

    // Check against music platforms first (more common)
    for (const platform of MUSIC_PLATFORMS) {
      for (const pattern of platform.urlPatterns) {
        if (pattern.test(normalizedUrl)) {
          return {
            isValid: true,
            platform,
            contentType: "music",
          };
        }
      }
    }

    // Check against podcast platforms
    for (const platform of PODCAST_PLATFORMS) {
      for (const pattern of platform.urlPatterns) {
        if (pattern.test(normalizedUrl)) {
          return {
            isValid: true,
            platform,
            contentType: "podcast",
          };
        }
      }
    }

    // URL is not from a supported platform
    return {
      isValid: false,
      error: "URL is not from a supported streaming platform",
    };
  }

  /**
   * Extracts the base domain from a URL for display purposes
   * @param url - The URL to extract domain from
   * @returns The base domain (e.g., 'spotify.com')
   */
  static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return "unknown";
    }
  }

  /**
   * Checks if a URL requires conversion
   * Some URLs might already be song.link URLs
   * @param url - The URL to check
   * @returns true if the URL needs conversion
   */
  static needsConversion(url: string): boolean {
    // Don't try to convert song.link or odesli URLs
    const excludedDomains = ["song.link", "odesli.co"];
    const domain = this.extractDomain(url);

    return !excludedDomains.some((excluded) => domain.includes(excluded));
  }
}
