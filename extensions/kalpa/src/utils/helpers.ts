/**
 * Helper utilities for the Kalpa Raycast extension
 */

import { Color, Icon } from "@raycast/api";
import type { KalpaLink, KalpaUniverse, KalpaTag } from "../types";

/**
 * Get an appropriate icon for a link based on its type
 */
export function getLinkIcon(link: KalpaLink): Icon {
  if (link.linkType === "youtube" || link.url.includes("youtube.com") || link.url.includes("youtu.be")) {
    return Icon.Play; // Play icon for videos (similar to web app)
  }
  if (link.linkType === "codepen" || link.url.includes("codepen.io")) {
    return Icon.Code;
  }
  if (link.is_archived) {
    return Icon.Tray;
  }
  if (link.is_read) {
    return Icon.CheckCircle;
  }
  return Icon.Link;
}

/**
 * Get icon tint color based on link status
 */
export function getLinkIconColor(link: KalpaLink): Color {
  if (link.is_archived) {
    return Color.SecondaryText;
  }
  if (link.is_read) {
    return Color.Green;
  }
  return Color.PrimaryText;
}

/**
 * Format a domain for display (remove www. prefix)
 */
export function formatDomain(domain: string): string {
  return domain.replace(/^www\./, "");
}

/**
 * Format a timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) {
    return `${months}mo ago`;
  }
  if (weeks > 0) {
    return `${weeks}w ago`;
  }
  if (days > 0) {
    return `${days}d ago`;
  }
  if (hours > 0) {
    return `${hours}h ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return "Just now";
}

/**
 * Get a color from hex string for Raycast
 */
export function hexToRaycastColor(hex: string): Color {
  // Map common colors to Raycast colors
  const colorMap: Record<string, Color> = {
    "#a78bfa": Color.Purple,
    "#f472b6": Color.Magenta,
    "#fb7185": Color.Red,
    "#fbbf24": Color.Yellow,
    "#34d399": Color.Green,
    "#60a5fa": Color.Blue,
    "#f87171": Color.Red,
    "#a3a3a3": Color.SecondaryText,
  };

  return colorMap[hex.toLowerCase()] || Color.PrimaryText;
}

/**
 * Get universe icon with color
 */
export function getUniverseIcon(universe: KalpaUniverse): { source: Icon; tintColor: Color } {
  return {
    source: Icon.Circle,
    tintColor: hexToRaycastColor(universe.color),
  };
}

/**
 * Get tag icon with color
 */
export function getTagIcon(tag: KalpaTag): { source: Icon; tintColor: Color } {
  return {
    source: Icon.Tag,
    tintColor: hexToRaycastColor(tag.color),
  };
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Get YouTube thumbnail URL from video ID
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Extract keywords from a link for better search
 */
export function extractKeywords(link: KalpaLink): string[] {
  const keywords: string[] = [];

  // Add title words
  keywords.push(...link.title.toLowerCase().split(/\s+/));

  // Add domain
  keywords.push(formatDomain(link.domain).toLowerCase());

  // Add tags
  if (link.tags) {
    keywords.push(...link.tags.map((t) => t.name.toLowerCase()));
  }

  // Add universes
  if (link.universes) {
    keywords.push(...link.universes.map((u) => u.name.toLowerCase()));
  }

  // Add link type
  if (link.linkType) {
    keywords.push(link.linkType);
  }

  return [...new Set(keywords)]; // Deduplicate
}

/**
 * Check if a link matches a search query
 */
export function matchesSearch(link: KalpaLink, query: string): boolean {
  if (!query) return true;

  const lowerQuery = query.toLowerCase();
  const keywords = extractKeywords(link);

  // Check if any keyword starts with the query
  if (keywords.some((k) => k.includes(lowerQuery))) {
    return true;
  }

  // Check title
  if (link.title.toLowerCase().includes(lowerQuery)) {
    return true;
  }

  // Check URL
  if (link.url.toLowerCase().includes(lowerQuery)) {
    return true;
  }

  // Check summary
  if (link.summary_preview?.toLowerCase().includes(lowerQuery)) {
    return true;
  }

  return false;
}

/**
 * Sort links by relevance to a search query
 */
export function sortByRelevance(links: KalpaLink[], query: string): KalpaLink[] {
  if (!query) {
    // Sort by creation time (newest first) when no query
    return [...links].sort((a, b) => b._creationTime - a._creationTime);
  }

  const lowerQuery = query.toLowerCase();

  return [...links].sort((a, b) => {
    // Title exact match gets highest priority
    const aExactTitle = a.title.toLowerCase() === lowerQuery;
    const bExactTitle = b.title.toLowerCase() === lowerQuery;
    if (aExactTitle && !bExactTitle) return -1;
    if (bExactTitle && !aExactTitle) return 1;

    // Title starts with query
    const aStartsTitle = a.title.toLowerCase().startsWith(lowerQuery);
    const bStartsTitle = b.title.toLowerCase().startsWith(lowerQuery);
    if (aStartsTitle && !bStartsTitle) return -1;
    if (bStartsTitle && !aStartsTitle) return 1;

    // Title contains query
    const aContainsTitle = a.title.toLowerCase().includes(lowerQuery);
    const bContainsTitle = b.title.toLowerCase().includes(lowerQuery);
    if (aContainsTitle && !bContainsTitle) return -1;
    if (bContainsTitle && !aContainsTitle) return 1;

    // Fall back to creation time
    return b._creationTime - a._creationTime;
  });
}
