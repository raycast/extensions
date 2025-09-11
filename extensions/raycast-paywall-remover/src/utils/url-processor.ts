/**
 * URL processing utilities for validation and formatting
 */
export class UrlProcessor {
  /**
   * URL regex pattern to match HTTP/HTTPS URLs
   */
  private static readonly URL_REGEX = /^https?:\/\/[^\s<>"{}|\\^`[\]]+$/;

  /**
   * Validates if a string is a properly formatted URL
   * @param url - URL string to validate
   * @returns boolean - true if valid URL
   */
  static isValidUrl(url: string): boolean {
    if (!url || typeof url !== "string") {
      return false;
    }

    // Check basic format with regex
    if (!this.URL_REGEX.test(url.trim())) {
      return false;
    }

    try {
      const urlObj = new URL(url.trim());
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Formats a URL for use with paywall removal service
   * @param targetUrl - The URL to be processed by the paywall service
   * @param serviceUrl - The paywall removal service URL
   * @returns string - Formatted URL for the service
   */
  static formatForService(targetUrl: string, serviceUrl: string): string {
    if (!this.isValidUrl(targetUrl)) {
      throw new Error("Invalid target URL provided");
    }

    if (!this.isValidServiceUrl(serviceUrl)) {
      throw new Error("Invalid service URL provided");
    }

    // Clean the service URL (remove trailing slash if present)
    const cleanServiceUrl = serviceUrl.replace(/\/$/, "");

    // Don't encode the target URL - paywall services expect plain URLs
    // Most services like 12ft.io, 13ft.io expect: service.com/https://example.com/article
    // Not: service.com/https%3A%2F%2Fexample.com%2Farticle

    // Format: serviceUrl/targetUrl
    return `${cleanServiceUrl}/${targetUrl}`;
  }

  /**
   * Validates if a service URL is properly formatted
   * @param serviceUrl - Service URL to validate
   * @returns boolean - true if valid service URL
   */
  static isValidServiceUrl(serviceUrl: string): boolean {
    if (!serviceUrl || typeof serviceUrl !== "string") {
      return false;
    }

    try {
      const urlObj = new URL(serviceUrl.trim());
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Extracts domain from a URL
   * @param url - URL to extract domain from
   * @returns string | null - Domain or null if invalid URL
   */
  static extractDomain(url: string): string | null {
    if (!this.isValidUrl(url)) {
      return null;
    }

    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  /**
   * Normalizes a URL by removing unnecessary parts
   * @param url - URL to normalize
   * @returns string - Normalized URL
   */
  static normalizeUrl(url: string): string {
    if (!this.isValidUrl(url)) {
      throw new Error("Invalid URL provided for normalization");
    }

    try {
      const urlObj = new URL(url.trim());

      // Remove fragment (hash) as it's not needed for paywall removal
      urlObj.hash = "";

      // Keep query parameters as they might be important for the article
      return urlObj.toString();
    } catch {
      throw new Error("Failed to normalize URL");
    }
  }

  /**
   * Checks if URL has query parameters
   * @param url - URL to check
   * @returns boolean - true if URL has query parameters
   */
  static hasQueryParameters(url: string): boolean {
    if (!this.isValidUrl(url)) {
      return false;
    }

    try {
      const urlObj = new URL(url);
      return urlObj.search.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Extracts query parameters from URL
   * @param url - URL to extract parameters from
   * @returns Record<string, string> - Query parameters as key-value pairs
   */
  static extractQueryParameters(url: string): Record<string, string> {
    if (!this.isValidUrl(url)) {
      return {};
    }

    try {
      const urlObj = new URL(url);
      const params: Record<string, string> = {};

      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      return params;
    } catch {
      return {};
    }
  }

  /**
   * Checks if URL is a shortened URL (common shortening services)
   * @param url - URL to check
   * @returns boolean - true if appears to be a shortened URL
   */
  static isShortenedUrl(url: string): boolean {
    if (!this.isValidUrl(url)) {
      return false;
    }

    const shortenedDomains = [
      "bit.ly",
      "tinyurl.com",
      "t.co",
      "goo.gl",
      "ow.ly",
      "short.link",
      "tiny.cc",
      "is.gd",
      "buff.ly",
      "adf.ly",
    ];

    try {
      const urlObj = new URL(url);
      return shortenedDomains.some((domain) => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  /**
   * Validates and cleans a URL for processing
   * @param url - URL to validate and clean
   * @returns string - Cleaned URL ready for processing
   */
  static validateAndClean(url: string): string {
    if (!url || typeof url !== "string") {
      throw new Error("URL must be a non-empty string");
    }

    const trimmedUrl = url.trim();

    if (!this.isValidUrl(trimmedUrl)) {
      throw new Error("Invalid URL format");
    }

    return this.normalizeUrl(trimmedUrl);
  }
}
