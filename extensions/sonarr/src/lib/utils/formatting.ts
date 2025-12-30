import { getPreferenceValues } from "@raycast/api";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import type { Image, Ratings } from "@/lib/types/episode";
import { CoverType } from "@/lib/types/episode";

export function getSonarrUrl(): string {
  const preferences = getPreferenceValues<Preferences>();
  const { http, host, port, base } = preferences;
  const baseUrl = base ? `/${base.replace(/^\/|\/$/g, "")}` : "";
  return `${http}://${host}:${port}${baseUrl}`;
}

export function formatSeriesTitle(title: string, year?: number): string {
  if (year) {
    return `${title} (${year})`;
  }
  return title;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes === 0) return "N/A";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return `${mins}m`;
}

export function formatAirDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, "EEE, MMM d, yyyy");
  } catch {
    return "Unknown";
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

export function formatOverview(overview: string, maxLength?: number): string {
  if (!overview) return "No overview available.";

  const cleanedOverview = overview.replace(/\n\n+/g, "\n\n").trim();

  if (maxLength && cleanedOverview.length > maxLength) {
    return cleanedOverview.substring(0, maxLength).trim() + "...";
  }

  return cleanedOverview;
}

export function getSeriesPoster(images: Image[]): string | undefined {
  const poster = images.find((img) => img.coverType === CoverType.Poster);
  return poster?.remoteUrl || poster?.url;
}

export function getRatingDisplay(ratings: Ratings): string {
  if (!ratings || !ratings.value) return "N/A";

  const ratingValue = ratings.value.toFixed(1);
  const votes = ratings.votes || 0;

  return `⭐ ${ratingValue}/10 (${votes.toLocaleString()} votes)`;
}

export function getSeriesStatus(status: string): string {
  const statusMap: Record<string, string> = {
    continuing: "Continuing",
    ended: "Ended",
    upcoming: "Upcoming",
    deleted: "Deleted",
  };

  return statusMap[status.toLowerCase()] || status;
}

export function getGenresDisplay(genres: string[], maxGenres: number = 3): string {
  if (!genres || genres.length === 0) return "N/A";

  const displayGenres = genres.slice(0, maxGenres);
  const remaining = genres.length - maxGenres;

  if (remaining > 0) {
    return `${displayGenres.join(", ")} +${remaining}`;
  }

  return displayGenres.join(", ");
}

export function formatEpisodeNumber(seasonNumber: number, episodeNumber: number): string {
  const season = seasonNumber.toString().padStart(2, "0");
  const episode = episodeNumber.toString().padStart(2, "0");
  return `S${season}E${episode}`;
}

export function getEpisodeStatus(
  airDate: string,
  hasFile: boolean,
  monitored: boolean,
): {
  icon: string;
  color: string;
  label: string;
} {
  const date = new Date(airDate);

  if (hasFile) {
    return {
      icon: "✅",
      color: "#00FF00",
      label: "Available",
    };
  }

  if (isFuture(date)) {
    return {
      icon: "⏳",
      color: "#FFA500",
      label: "Not Aired",
    };
  }

  if (isPast(date) && monitored) {
    return {
      icon: "🔴",
      color: "#FF0000",
      label: "Missing",
    };
  }

  return {
    icon: "⚪",
    color: "#808080",
    label: "Unmonitored",
  };
}

export function formatQualityProfile(quality: { name: string; resolution: number }): string {
  return `${quality.name} (${quality.resolution}p)`;
}

export function formatDownloadProgress(sizeleft: number, size: number): number {
  if (size === 0) return 0;
  return ((size - sizeleft) / size) * 100;
}

export function formatTimeLeft(timespan: string): string {
  if (!timespan) return "Unknown";

  const match = timespan.match(/(\d+)\.(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return timespan;

  const [, days, hours, minutes] = match;
  const parts: string[] = [];

  if (parseInt(days) > 0) parts.push(`${parseInt(days)}d`);
  if (parseInt(hours) > 0) parts.push(`${parseInt(hours)}h`);
  if (parseInt(minutes) > 0) parts.push(`${parseInt(minutes)}m`);

  return parts.length > 0 ? parts.join(" ") : "< 1m";
}
