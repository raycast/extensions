import { Color, Icon } from "@raycast/api";

import { EntityType, MBArtistCredit, MBGenre } from "./types";

const MBID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MB_URL_REGEX =
  /^https?:\/\/(?:www\.)?musicbrainz\.org\/(artist|release|recording|release-group|label|work)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

interface MBDirectLookup {
  entityType: EntityType | null;
  mbid: string;
}

export function parseMusicBrainzInput(input: string): MBDirectLookup | null {
  const trimmed = input.trim();

  const urlMatch = trimmed.match(MB_URL_REGEX);

  if (urlMatch) {
    return { entityType: urlMatch[1] as EntityType, mbid: urlMatch[2] };
  }

  if (MBID_REGEX.test(trimmed)) {
    return { entityType: null, mbid: trimmed };
  }

  return null;
}

export function formatDuration(ms: number | undefined): string {
  if (ms == null) {
    return "";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatArtistCredit(credits: MBArtistCredit[] | undefined): string {
  if (!credits || credits.length === 0) {
    return "Unknown Artist";
  }

  return credits.map((c) => c.name + (c.joinphrase ?? "")).join("");
}

export function formatGenres(genres: MBGenre[] | undefined, limit = 5): string[] {
  if (!genres || genres.length === 0) {
    return [];
  }

  return genres
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((g) => g.name);
}

export function formatDateWithAge(date: string): string {
  const parts = date.split("-").map(Number);

  if (parts.length < 1 || isNaN(parts[0])) {
    return date;
  }

  const now = new Date();
  const year = parts[0];
  const month = parts.length >= 2 ? parts[1] - 1 : 0;
  const day = parts.length >= 3 ? parts[2] : 1;
  const then = new Date(year, month, day);

  let years = now.getFullYear() - then.getFullYear();

  const monthDiff = now.getMonth() - then.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < then.getDate())) {
    years--;
  }

  if (years < 0) {
    return date;
  }

  return `${date} (${years} years ago)`;
}

export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);

  if (weeks < 4) {
    return `${weeks}w ago`;
  }

  const months = Math.floor(days / 30);

  return `${months}mo ago`;
}

export function getEntityTypeLabel(type: EntityType): string {
  switch (type) {
    case "artist":
      return "Artist";
    case "release":
      return "Release";
    case "recording":
      return "Recording";
    case "release-group":
      return "Release Group";
    case "label":
      return "Label";
    case "work":
      return "Work";
  }
}

export function getEntityIcon(type: EntityType): { source: Icon; tintColor?: Color } {
  switch (type) {
    case "artist":
      return { source: Icon.Person };
    case "release":
      return { source: Icon.Cd };
    case "recording":
      return { source: Icon.Music };
    case "release-group":
      return { source: Icon.AppWindowList };
    case "label":
      return { source: Icon.Building };
    case "work":
      return { source: Icon.Document };
  }
}

export function getScoreColor(score: number): Color {
  if (score >= 90) {
    return Color.Green;
  }

  if (score >= 70) {
    return Color.Yellow;
  }

  if (score >= 50) {
    return Color.Orange;
  }

  return Color.Red;
}

export function escapeMarkdown(text: string): string {
  return text.replace(/([[\]|*_`#~\\>])/g, "\\$1");
}

export function formatTrackCount(media: { "track-count": number }[] | undefined): string {
  if (!media || media.length === 0) {
    return "";
  }

  const total = media.reduce((sum, m) => sum + m["track-count"], 0);

  return `${total} track${total !== 1 ? "s" : ""}`;
}

export function formatMediaFormats(media: { format?: string }[] | undefined): string {
  if (!media || media.length === 0) {
    return "";
  }

  const formats = [...new Set(media.map((m) => m.format).filter(Boolean))];

  return formats.join(", ");
}
