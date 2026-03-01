import { getPreferenceValues } from "@raycast/api";
import { format, formatDistanceToNow } from "date-fns";
import type { Image, Ratings } from "@/lib/types/lidarr";
import type { LidarrPreferences } from "@/lib/types/preferences";

export function getLidarrUrl(): string {
  const preferences = getPreferenceValues<LidarrPreferences>();
  const rawHost = preferences.host.trim();
  const rawPort = preferences.port.trim();
  const rawBase = preferences.base.trim();

  let protocol = preferences.http;
  let host = rawHost;
  let port = rawPort;
  let baseFromHost = "";

  if (/^https?:\/\//i.test(rawHost)) {
    try {
      const parsed = new URL(rawHost);
      protocol = parsed.protocol.replace(":", "") as "http" | "https";
      host = parsed.hostname;
      port = parsed.port || rawPort;
      baseFromHost = parsed.pathname === "/" ? "" : parsed.pathname;
    } catch {
      // Keep fallback values and let callers handle failures.
    }
  } else {
    const slashIndex = host.indexOf("/");

    if (slashIndex !== -1) {
      baseFromHost = host.slice(slashIndex + 1);
      host = host.slice(0, slashIndex);
    }

    const hostPortMatch = host.match(/^(.+):(\d+)$/);
    if (hostPortMatch) {
      host = hostPortMatch[1];
      port = hostPortMatch[2];
    }
  }

  host = host.replace(/\/+$/g, "");
  const basePath = (rawBase || baseFromHost).replace(/^\/|\/$/g, "");

  return `${protocol}://${host}${port ? `:${port}` : ""}${basePath ? `/${basePath}` : ""}`;
}

function getLidarrApiKey(): string {
  const preferences = getPreferenceValues<LidarrPreferences>();
  return preferences.apiKey?.trim() || "";
}

function appendApiKeyIfLidarrUrl(urlString: string): string {
  const apiKey = getLidarrApiKey();
  if (!apiKey) return urlString;

  try {
    const lidarrUrl = new URL(getLidarrUrl());
    const imageUrl = new URL(urlString);

    // Lidarr media cover files are served directly and work better without appending an API key.
    if (imageUrl.pathname.startsWith("/MediaCover/")) {
      return imageUrl.toString();
    }

    if (imageUrl.origin === lidarrUrl.origin && !imageUrl.searchParams.has("apikey")) {
      imageUrl.searchParams.set("apikey", apiKey);
    }

    return imageUrl.toString();
  } catch {
    return urlString;
  }
}

export function normalizeImageUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;

  const value = rawUrl.trim();
  if (!value) return undefined;

  // Lidarr can sometimes return local filesystem paths in remoteUrl on some setups.
  // These are not fetchable by Raycast and should be ignored so we can fall back to /MediaCover URLs.
  if (/^[a-zA-Z]:\\/.test(value) || value.includes("\\")) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return appendApiKeyIfLidarrUrl(value);
  }

  const lidarrUrl = getLidarrUrl().replace(/\/+$/g, "");

  if (value.startsWith("//")) {
    const protocol = lidarrUrl.startsWith("https://") ? "https:" : "http:";
    return appendApiKeyIfLidarrUrl(`${protocol}${value}`);
  }

  if (value.startsWith("/")) {
    return appendApiKeyIfLidarrUrl(`${lidarrUrl}${value}`);
  }

  return appendApiKeyIfLidarrUrl(`${lidarrUrl}/${value}`);
}

export function getPoster(images: Image[] = []): string | undefined {
  const preferredTypes = ["poster", "cover", "fanart", "screenshot"];

  for (const type of preferredTypes) {
    const match = images.find((img) => img.coverType.toLowerCase() === type);
    const resolved = normalizeImageUrl(match?.url) || normalizeImageUrl(match?.remoteUrl);
    if (resolved) return resolved;
  }

  for (const image of images) {
    const resolved = normalizeImageUrl(image.url) || normalizeImageUrl(image.remoteUrl);
    if (resolved) return resolved;
  }

  return undefined;
}

export function getArtistArt(images: Image[] = []): string | undefined {
  const preferredTypes = ["poster", "cover", "fanart", "screenshot"];

  const getSizedLocalVariant = (url?: string): string | undefined => {
    if (!url) return undefined;

    // Lidarr web UI commonly uses resized artist posters like poster-250.jpg.
    // Prefer those variants first because they appear to render more reliably in Raycast.
    const sized = url.replace(/\/poster(\.[a-z0-9]+)(\?.*)?$/i, "/poster-250$1$2");
    if (sized !== url) {
      return normalizeImageUrl(sized);
    }

    return undefined;
  };

  for (const type of preferredTypes) {
    const match = images.find((img) => img.coverType.toLowerCase() === type);
    const resolved = normalizeImageUrl(match?.remoteUrl);
    if (resolved) return resolved;
  }

  for (const image of images) {
    const resolved = normalizeImageUrl(image.remoteUrl);
    if (resolved) return resolved;
  }

  return undefined;
}

export function getAlbumArt(images: Image[] = []): string | undefined {
  const preferredTypes = ["cover", "poster", "fanart", "screenshot"];
  const preferLocal = getLidarrUrl().startsWith("https://");

  for (const type of preferredTypes) {
    const match = images.find((img) => img.coverType.toLowerCase() === type);
    const resolved = preferLocal
      ? normalizeImageUrl(match?.url) || normalizeImageUrl(match?.remoteUrl)
      : normalizeImageUrl(match?.remoteUrl) || normalizeImageUrl(match?.url);
    if (resolved) return resolved;
  }

  for (const image of images) {
    const resolved = preferLocal
      ? normalizeImageUrl(image.url) || normalizeImageUrl(image.remoteUrl)
      : normalizeImageUrl(image.remoteUrl) || normalizeImageUrl(image.url);
    if (resolved) return resolved;
  }

  return undefined;
}

export function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), "EEE, MMM d, yyyy");
  } catch {
    return "Unknown";
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2).replace(/\.00$/, "")} ${units[i]}`;
}

export function formatOverview(overview?: string | null, maxLength = 450): string {
  if (!overview) return "No overview available.";
  const cleaned = overview.replace(/\n\n+/g, "\n\n").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trim()}...`;
}

export function getRatingDisplay(ratings?: Ratings): string {
  if (!ratings?.value) return "N/A";
  const votes = ratings.votes ?? 0;
  return `${ratings.value.toFixed(1)}/10 (${votes.toLocaleString()} votes)`;
}

export function formatDownloadProgress(sizeleft: number, size: number): number {
  if (!size || size <= 0) return 0;
  return Math.max(0, Math.min(100, ((size - sizeleft) / size) * 100));
}

export function formatTimeLeft(timespan?: string): string {
  if (!timespan) return "Unknown";
  const match = timespan.match(/(\d+)\.(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return timespan;

  const [, days, hours, minutes] = match;
  const parts: string[] = [];

  if (Number(days) > 0) parts.push(`${Number(days)}d`);
  if (Number(hours) > 0) parts.push(`${Number(hours)}h`);
  if (Number(minutes) > 0) parts.push(`${Number(minutes)}m`);

  return parts.length > 0 ? parts.join(" ") : "< 1m";
}
