import { Icon, Image } from "@raycast/api";
import { Post, PostMetric } from "./types";

/**
 * Returns the channel avatar when Buffer provides one, otherwise a generic
 * fallback icon. Buffer supplies an avatar for every connected channel, so the
 * fallback is only a safety net.
 */
export function channelIcon(post: Post): Image.ImageLike {
  if (post.channel?.avatar) {
    return { source: post.channel.avatar, mask: Image.Mask.Circle };
  }
  return Icon.Globe;
}

export function serviceLabel(service: string): string {
  if (!service) return "Unknown";
  const map: Record<string, string> = {
    linkedin: "LinkedIn",
    twitter: "Twitter / X",
    x: "Twitter / X",
    instagram: "Instagram",
    facebook: "Facebook",
    pinterest: "Pinterest",
    youtube: "YouTube",
    tiktok: "TikTok",
    threads: "Threads",
    mastodon: "Mastodon",
    bluesky: "Bluesky",
    googlebusiness: "Google Business",
  };
  return map[service.toLowerCase()] ?? service;
}

export function truncate(text: string, max = 80): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  // Split by code points (Array.from) so we never cut an emoji / surrogate pair
  // in half – a lone surrogate breaks Raycast's render-tree JSON serialization.
  const chars = Array.from(singleLine);
  if (chars.length <= max) return singleLine;
  return `${chars.slice(0, max - 1).join("")}…`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function firstImageThumbnail(post: Post): string | undefined {
  const asset = post.assets?.find((a) => a.thumbnail || a.type?.toLowerCase() === "image");
  return asset?.thumbnail || asset?.source;
}

export function formatMetricValue(metric: PostMetric): string {
  const value = metric.value ?? 0;
  const rounded = Number.isInteger(value) ? value : Math.round(value * 100) / 100;
  return rounded.toLocaleString();
}

export interface MetricDelta {
  pct: number;
  direction: "up" | "down" | "flat";
}

export function computeDelta(current: number, previous: number): MetricDelta | null {
  if (previous === 0) {
    if (current === 0) return { pct: 0, direction: "flat" };
    return null; // can't express growth from zero as a percentage
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct);
  return {
    pct: rounded,
    direction: rounded > 0 ? "up" : rounded < 0 ? "down" : "flat",
  };
}

function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/**
 * Renders a KPI tile as an inline SVG data URI for use as Grid.Item content.
 * Buffer-branded dark card so text colors stay consistent in light + dark themes.
 */
export function metricTileSvg(name: string, value: number, delta: MetricDelta | null): string {
  const deltaColor = delta?.direction === "up" ? "#7CC77C" : delta?.direction === "down" ? "#E57373" : "#9AA5AD";
  const arrow = delta?.direction === "up" ? "▲" : delta?.direction === "down" ? "▼" : "▬";
  const deltaText = delta ? `${arrow} ${Math.abs(delta.pct)}%` : "no prior data";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
  <rect x="0" y="0" width="300" height="300" rx="24" fill="#1E2A32"/>
  <text x="150" y="70" font-family="-apple-system, Helvetica, sans-serif" font-size="22" fill="#9AB89A" text-anchor="middle">${escapeXml(name)}</text>
  <text x="150" y="170" font-family="-apple-system, Helvetica, sans-serif" font-size="72" font-weight="700" fill="#FFFFFF" text-anchor="middle">${escapeXml(compactNumber(value))}</text>
  <text x="150" y="230" font-family="-apple-system, Helvetica, sans-serif" font-size="26" font-weight="600" fill="${deltaColor}" text-anchor="middle">${escapeXml(deltaText)}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
