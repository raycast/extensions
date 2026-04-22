import { Channel } from "./types";

export function serviceIcon(service: string): string {
  const icons: Record<string, string> = {
    twitter: "🐦",
    x: "🐦",
    facebook: "📘",
    instagram: "📸",
    linkedin: "💼",
    tiktok: "🎵",
    pinterest: "📌",
    mastodon: "🐘",
    youtube: "▶️",
    threads: "🧵",
    bluesky: "🦋",
    googlebusiness: "🏢",
  };
  return icons[service.toLowerCase()] ?? "📱";
}

export function serviceName(service: string): string {
  const names: Record<string, string> = {
    twitter: "Twitter / X",
    x: "X (Twitter)",
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
    pinterest: "Pinterest",
    mastodon: "Mastodon",
    youtube: "YouTube",
    threads: "Threads",
    bluesky: "Bluesky",
    googlebusiness: "Google Business",
  };
  return names[service.toLowerCase()] ?? service;
}

export function formatDate(isoString?: string): string {
  if (!isoString) return "No date";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatUnixTimestamp(timestamp?: number): string {
  if (!timestamp) return "No date";
  const normalized =
    timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000;
  return formatDate(new Date(normalized).toISOString());
}

export function truncateText(text: string, maxLength = 80): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

export function channelLabel(channel?: Channel): string {
  if (!channel) return "Unknown channel";
  return `${serviceIcon(channel.service)} ${channel.displayName || channel.name}`;
}

export function postStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
