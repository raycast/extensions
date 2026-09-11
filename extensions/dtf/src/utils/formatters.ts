// Common formatting utilities for DTF extension
// Centralized to avoid code duplication across commands

import { Icon, Image } from "@raycast/api";
import { DisplayPost } from "../api/types";

/**
 * Format a date as relative time (e.g., "5m ago", "2h ago", "3d ago")
 */
export function formatRelativeDate(date: Date | string): string {
  // Handle cached dates that are serialized as strings
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return dateObj.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/**
 * Format a date as relative time without "ago" suffix (for menu bar)
 */
export function formatRelativeDateShort(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return dateObj.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/**
 * Format a number with K/M suffix for large values
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return String(num);
}

/**
 * Format a full date with time
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

/**
 * Get post icon from subsite or author avatar
 */
export function getPostIcon(post: DisplayPost): Image.ImageLike {
  if (post.subsite?.avatar) {
    return { source: post.subsite.avatar, mask: Image.Mask.Circle };
  }
  if (post.author?.avatar) {
    return { source: post.author.avatar, mask: Image.Mask.Circle };
  }
  return Icon.Document;
}
