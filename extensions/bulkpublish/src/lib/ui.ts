import { Color, Icon, Image } from "@raycast/api";
import { Channel, platformLabel, Post } from "./core";

const KNOWN_PLATFORMS = new Set([
  "bluesky",
  "discord",
  "facebook",
  "gmb",
  "instagram",
  "linkedin",
  "mastodon",
  "pinterest",
  "snapchat",
  "telegram",
  "threads",
  "tiktok",
  "tumblr",
  "x",
  "youtube",
]);

/** Single-colour marks that would disappear on a dark or light background. */
const TINT: Record<string, Color.ColorLike> = {
  x: Color.PrimaryText,
  threads: Color.PrimaryText,
  tiktok: Color.PrimaryText,
  tumblr: Color.PrimaryText,
  snapchat: Color.Yellow,
};

export function platformIcon(platform: string): Image.ImageLike {
  if (!KNOWN_PLATFORMS.has(platform)) return Icon.Globe;
  return { source: `platforms/${platform}.svg`, tintColor: TINT[platform] };
}

export function channelIcon(c: Channel): Image.ImageLike {
  if (c.profileImage) return { source: c.profileImage, mask: Image.Mask.Circle, fallback: Icon.PersonCircle };
  return platformIcon(c.platform);
}

export function channelTitle(c: Channel): string {
  return `${c.name} (${platformLabel(c.platform)})`;
}

interface StatusLook {
  label: string;
  color: Color;
  icon: Icon;
}

export function postStatusLook(p: Post): StatusLook {
  if (p.approvalStatus === "pending") return { label: "Awaiting Approval", color: Color.Purple, icon: Icon.Hourglass };
  if (p.approvalStatus === "rejected" && p.status === "draft")
    return { label: "Rejected", color: Color.Red, icon: Icon.XMarkCircle };
  switch (p.status) {
    case "published":
      return { label: "Published", color: Color.Green, icon: Icon.CheckCircle };
    case "scheduled":
      return { label: "Scheduled", color: Color.Blue, icon: Icon.Clock };
    case "draft":
      return { label: "Draft", color: Color.SecondaryText, icon: Icon.Document };
    case "publishing":
    case "processing":
      return { label: "Publishing", color: Color.Orange, icon: Icon.CircleProgress50 };
    case "partial":
      return { label: "Partly Published", color: Color.Yellow, icon: Icon.Warning };
    case "failed":
      return { label: "Failed", color: Color.Red, icon: Icon.XMarkCircle };
    default:
      return { label: p.status, color: Color.SecondaryText, icon: Icon.Circle };
  }
}

export function destinationLook(status: string): { label: string; color: Color } {
  switch (status) {
    case "published":
      return { label: "Published", color: Color.Green };
    case "failed":
      return { label: "Failed", color: Color.Red };
    case "unconfirmed":
      return { label: "Unconfirmed", color: Color.Yellow };
    case "publishing":
    case "processing":
      return { label: "Publishing", color: Color.Orange };
    default:
      return { label: "Pending", color: Color.SecondaryText };
  }
}

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const timeFmt = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

export const formatDateTime = (iso: string) => dateFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

/** "Today", "Tomorrow" or "Friday, November 7". */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(d) - startOf(now)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return dayFmt.format(d);
}

/** The time that matters for a post: when it went out, or when it will. */
export function postTime(p: Post): { date: Date; tooltip: string } | null {
  if (p.publishedAt) return { date: new Date(p.publishedAt), tooltip: `Published ${formatDateTime(p.publishedAt)}` };
  if (p.scheduledAt)
    return { date: new Date(p.scheduledAt), tooltip: `Scheduled for ${formatDateTime(p.scheduledAt)}` };
  if (p.updatedAt) return { date: new Date(p.updatedAt), tooltip: `Last edited ${formatDateTime(p.updatedAt)}` };
  return null;
}

export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
