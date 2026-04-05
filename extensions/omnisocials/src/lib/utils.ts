import { Color, Icon } from "@raycast/api";
import type { Post } from "./types";
import { PLATFORM_LABELS, type Platform } from "./constants";

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getPostText(post: Post): string {
  return (
    post.content.default || Object.values(post.content).find((v) => v) || ""
  );
}

export function getPostTitle(post: Post): string {
  const text = getPostText(post);
  const firstLine = text.split("\n")[0];
  return firstLine.length > 80
    ? firstLine.slice(0, 77) + "..."
    : firstLine || "Untitled post";
}

export function getPostSubtitle(post: Post): string {
  const platforms = extractPlatforms(post);
  return platforms.map((p) => PLATFORM_LABELS[p as Platform] || p).join(", ");
}

export function extractPlatforms(post: Post): string[] {
  return post.accounts.map((accountId) => {
    const parts = accountId.split("_");
    return parts[parts.length - 1] || accountId;
  });
}

export function getStatusIcon(status: string): {
  source: Icon;
  tintColor: Color;
} {
  switch (status) {
    case "draft":
      return { source: Icon.Pencil, tintColor: Color.SecondaryText };
    case "scheduled":
      return { source: Icon.Clock, tintColor: Color.Yellow };
    case "posted":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failed":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "warning":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

export function getPlatformIcon(platform: string): Icon {
  switch (platform) {
    case "instagram":
      return Icon.Image;
    case "facebook":
      return Icon.PersonCircle;
    case "linkedin":
      return Icon.TwoPeople;
    case "youtube":
      return Icon.Video;
    case "tiktok":
      return Icon.Music;
    case "x":
      return Icon.Bird;
    case "pinterest":
      return Icon.Pin;
    case "bluesky":
      return Icon.Cloud;
    case "threads":
      return Icon.Message;
    case "mastodon":
      return Icon.Globe;
    default:
      return Icon.Globe;
  }
}

export function getTypeTag(type: string): { label: string; color: Color } {
  switch (type) {
    case "story":
      return { label: "Story", color: Color.Purple };
    case "reel":
      return { label: "Reel", color: Color.Magenta };
    default:
      return { label: "Post", color: Color.Blue };
  }
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return String(num);
}
