import TurndownService from "turndown";
import he from "he"; // HTML entity encoder/decoder
import { TurndownNode } from "./types";

// Initialize TurndownService for HTML to Markdown conversion
export const turndownService = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

turndownService.addRule("dealImage", {
  filter: "img",
  replacement: function (content, node) {
    const element = node as TurndownNode;
    const src = element.getAttribute("src");
    const alt = element.getAttribute("alt") || "";
    if (src) {
      try {
        if (!isValidUrl(src)) {
          console.warn("Blocked invalid or unsafe URL scheme in deal image:", src);
          return "";
        }
        const sanitizedSrc = new URL(src).href; // Validate and sanitize URL
        return `![${alt}](${sanitizedSrc})`;
      } catch (error) {
        console.error("Invalid image URL in deal description:", src, error);
        return ""; // Return empty string if URL is invalid
      }
    }
    return "";
  },
});

turndownService.addRule("dealLink", {
  filter: "a",
  replacement: function (content, node) {
    const element = node as TurndownNode;
    const href = element.getAttribute("href");
    if (href && content) {
      return `[${he.decode(content).trim()}](${href})`;
    }
    return content;
  },
});

/**
 * Validates if a URL is safe and has an allowed protocol.
 * @param urlString The URL string to validate.
 * @returns True if the URL is valid and safe, false otherwise.
 */
export function isValidUrl(urlString: string): boolean {
  if (!urlString) return false;

  try {
    const url = new URL(urlString);
    // Explicitly disallow potentially unsafe protocols
    const disallowedProtocols = ["javascript:", "data:", "file:", "ftp:", "sftp:", "ws:", "wss:"];
    if (disallowedProtocols.includes(url.protocol.toLowerCase())) {
      return false;
    }

    // Allow only http and https protocols for external links, or relative URLs
    // If a URL is relative, its protocol will be 'http:' or 'https:' if parsed against a base URL
    // For this context, we assume all valid URLs for image src and link href should be absolute http/https
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    // URL constructor will throw an error for invalid URLs
    // Also, handle cases where URLString might be a relative path that new URL() can't resolve without a base
    // For image src and link href, relative paths are usually resolved by the browser, but here we want explicit control.
    // If it's a relative path starting with '/', './', '../', treat as potentially valid if it doesn't contain disallowed characters
    // However, given the context of sanitizing RSS feed, we generally expect absolute URLs for external resources.
    // A simple check for relative paths that don't start with protocol and don't contain XSS vectors.
    const lowerCaseUrl = urlString.toLowerCase();
    if (lowerCaseUrl.startsWith("/") || lowerCaseUrl.startsWith("./") || lowerCaseUrl.startsWith("../")) {
        // Basic check to prevent common XSS in relative paths (e.g., /%20javascript:alert(1))
        // This is a very simplistic check and might need more sophistication depending on how relative URLs are handled downstream.
        return !lowerCaseUrl.includes("javascript:") && !lowerCaseUrl.includes("data:");
    }
    return false;
  }
}

// Helper function to extract store name from title
export function extractStoreFromTitle(title: string): string {
  // Look for patterns like "@ Store Name" at the end of titles
  const storeMatch = title.match(/@\s*([^@]+?)(?:\s*$|\s*\[|\s*\()/);
  if (storeMatch && storeMatch[1]) {
    return storeMatch[1].trim();
  }
  return "";
}

// Helper function to format time ago
export function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000; // Years
  if (interval > 1) return `${Math.floor(interval)}y`;
  interval = seconds / 2592000; // Months
  if (interval > 1) return `${Math.floor(interval)}mo`;
  interval = seconds / 86400; // Days
  if (interval > 1) return `${Math.floor(interval)}d`;
  interval = seconds / 3600; // Hours
  if (interval > 1) return `${Math.floor(interval)}h`;
  interval = seconds / 60; // Minutes
  if (interval > 1) return `${Math.floor(interval)}m`;
  return `${Math.floor(seconds)}s`;
}

/**
 * Truncates a string to a specified length and appends an ellipsis if truncated.
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length > maxLength) {
    return `${str.substring(0, maxLength)}...`;
  }
  return str;
}
