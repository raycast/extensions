import TurndownService from "turndown";
import he from "he";
import { showFailureToast } from "@raycast/utils";
import { TurndownNode } from "./types";

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
        const sanitizedSrc = new URL(src).href;
        return `![${alt}](${sanitizedSrc})`;
      } catch (error) {
        showFailureToast(error, { title: "Invalid Image URL in Deal" });
        return "";
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
    const disallowedProtocols = ["javascript:", "data:", "file:", "ftp:", "sftp:", "ws:", "wss:"];
    if (disallowedProtocols.includes(url.protocol.toLowerCase())) {
      return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    const lowerCaseUrl = urlString.toLowerCase();
    if (lowerCaseUrl.startsWith("/") || lowerCaseUrl.startsWith("./") || lowerCaseUrl.startsWith("../")) {
      return !lowerCaseUrl.includes("javascript:") && !lowerCaseUrl.includes("data:");
    }
    return false;
  }
}

export function extractStoreFromTitle(title: string): string {
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
 **/
export function truncateString(str: string, maxLength: number): string {
  if (str.length > maxLength) {
    return `${str.substring(0, maxLength)}...`;
  }
  return str;
}
