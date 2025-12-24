/**
 * Utility functions for formatting numbers and dates
 */

/**
 * Format large numbers with K/M suffixes (max 3 digits, no decimals)
 * @param num - The number to format
 * @returns Formatted string (e.g., "527", "1K", "13K", "572K", "1M")
 */
export function formatNumber(num: number): string {
  // Handle invalid values
  if (num === null || num === undefined || isNaN(num) || num < 0) {
    return "0";
  }

  // 0-999: show as is
  if (num < 1000) {
    return num.toString();
  }

  // 1K-999K: show in K without decimals
  if (num < 1000000) {
    const k = Math.round(num / 1000);
    return `${k}K`;
  }

  // 1M+: show in M without decimals
  const m = Math.round(num / 1000000);
  return `${m}M`;
}

/**
 * Format date as relative time (e.g., "1d", "2w")
 * @param dateString - ISO 8601 date string
 * @returns Formatted relative time string (short format)
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // Less than 1 minute
  if (diffSeconds < 60) {
    return "now";
  }

  // Less than 1 hour
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  // Less than 1 day
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  // Less than 1 week (show days)
  if (diffDays < 7) {
    return `${diffDays}d`;
  }

  // Less than 1 month (show weeks)
  if (diffDays < 30) {
    return `${diffWeeks}w`;
  }

  // Less than 1 year (show months, minimum 1)
  if (diffDays < 365) {
    const months = Math.max(1, diffMonths);
    return `${months}mo`;
  }

  // 1 year or more
  const years = Math.max(1, diffYears);
  return `${years}y`;
}

/**
 * Extract code blocks from markdown content
 * @param markdown - The markdown content
 * @returns Array of code block strings
 */
export function extractCodeBlocks(markdown: string): string[] {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const matches = markdown.match(codeBlockRegex) || [];

  return matches.map((block) => {
    // Remove the ``` delimiters and optional language identifier
    const lines = block.split("\n");
    // Remove first line (```language) and last line (```)
    return lines.slice(1, -1).join("\n");
  });
}
