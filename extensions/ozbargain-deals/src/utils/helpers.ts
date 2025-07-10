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
