import { getLinkPreview } from "link-preview-js";
import { PageInfo } from "../types";

export function normalizeUrl(input: string): string {
  try {
    let url = input.trim();

    // If no protocol is specified, add https://
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    // Parse URL to validate and normalize
    const urlObj = new URL(url);

    // Ensure hostname has at least one dot and valid TLD
    if (!urlObj.hostname.includes(".") || urlObj.hostname.endsWith(".")) {
      throw new Error("Invalid hostname");
    }

    // Remove default ports (80 for HTTP, 443 for HTTPS)
    if (
      (urlObj.protocol === "http:" && urlObj.port === "80") ||
      (urlObj.protocol === "https:" && urlObj.port === "443")
    ) {
      urlObj.port = "";
    }

    // Remove trailing slashes
    return urlObj.toString().replace(/\/$/, "");
  } catch {
    throw new Error("Invalid URL");
  }
}

export function isValidUrl(urlString: string): boolean {
  try {
    // Common invalid URL patterns
    const invalidPatterns = [
      /^javascript:/i, // JavaScript URLs
      /^data:/i, // Data URLs
      /^about:/i, // About URLs
      /^file:/i, // File URLs
      /localhost/i, // Localhost
      /^127\./, // Local IPs
      /^192\.168\./, // Local IPs
      /^10\./, // Local IPs
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Local IPs
    ];

    // Check for invalid patterns
    if (invalidPatterns.some((pattern) => pattern.test(urlString))) {
      return false;
    }

    // Try to normalize and validate the URL
    const normalized = normalizeUrl(urlString);
    const url = new URL(normalized);

    // Additional validation checks
    return (
      // Must have a hostname with at least one dot
      url.hostname.includes(".") &&
      // Must not end with a dot
      !url.hostname.endsWith(".") &&
      // Must be HTTP or HTTPS
      /^https?:$/i.test(url.protocol) &&
      // Hostname must be reasonable length
      url.hostname.length >= 3 &&
      url.hostname.length <= 253
    );
  } catch {
    return false;
  }
}

export async function getPageInfo(url: string): Promise<PageInfo> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);

    // Use link-preview-js to get rich metadata
    const preview = await getLinkPreview(normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
      },
      timeout: 5000,
      followRedirects: "follow",
      handleRedirects: (baseURL: string, forwardedURL: string) => {
        const urlObj = new URL(baseURL);
        const forwardedURLObj = new URL(forwardedURL);
        if (
          forwardedURLObj.hostname === urlObj.hostname ||
          forwardedURLObj.hostname === "www." + urlObj.hostname ||
          urlObj.hostname === "www." + forwardedURLObj.hostname
        ) {
          return true;
        } else {
          return false;
        }
      },
    });

    // Extract data from link preview with type safety
    const title = "title" in preview ? preview.title : urlObj.hostname;
    const description = "description" in preview ? preview.description : undefined;
    const images = "images" in preview ? preview.images : undefined;
    const image = images && Array.isArray(images) && images.length > 0 ? images[0] : undefined;
    const favicons = preview.favicons;
    const favicon = favicons && Array.isArray(favicons) && favicons.length > 0 ? favicons[0] : undefined;
    const siteName = "siteName" in preview ? preview.siteName : undefined;

    return {
      title,
      hostname: urlObj.hostname,
      description,
      image,
      favicon,
      siteName,
    };
  } catch (e) {
    console.error("Error fetching metadata with link-preview-js:", e);
    try {
      // Fallback - just extract hostname from the URL
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      return {
        title: urlObj.hostname,
        hostname: urlObj.hostname,
      };
    } catch (err) {
      // If we can't even parse the URL, return placeholder values
      return {
        title: url,
        hostname: "unknown",
      };
    }
  }
}
