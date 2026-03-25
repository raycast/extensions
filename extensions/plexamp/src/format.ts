import { getPreferenceValues } from "@raycast/api";
import type { MetadataItem, MusicTrack } from "./types";

export function formatDuration(milliseconds?: number): string {
  if (!milliseconds || milliseconds < 0) {
    return "--:--";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatTrackTitlePrefix(parentIndex?: number, index?: number): string {
  if (!index) {
    return "";
  }

  if (parentIndex) {
    return `${parentIndex}.${String(index).padStart(2, "0")} `;
  }

  return `${String(index).padStart(2, "0")} `;
}

export type TrackRatingDisplayMode = "fiveStars" | "fiveStarsHalf" | "oneStar";

const DEFAULT_MENU_BAR_FORMAT = "{track} - {artist}";

export function getTrackRatingDisplayMode(): TrackRatingDisplayMode {
  const value = getPreferenceValues<Preferences>().trackRatings;

  if (value === "fiveStarsHalf" || value === "oneStar") {
    return value;
  }

  return "fiveStars";
}

export function getMenuBarFormat(): string {
  const value = getPreferenceValues<Preferences>().menuBarFormat?.trim();
  return value || DEFAULT_MENU_BAR_FORMAT;
}

export function formatNowPlayingMenuBarTitle(
  item: MetadataItem | undefined,
  format: string = getMenuBarFormat(),
): string {
  if (!item) {
    return "Nothing playing";
  }

  const tokens = {
    "{track}": item.type === "track" ? item.title : "",
    "{album}": item.type === "track" ? (item.parentTitle ?? "") : item.type === "album" ? item.title : "",
    "{artist}":
      item.type === "track"
        ? (item.grandparentTitle ?? "")
        : item.type === "album"
          ? (item.parentTitle ?? "")
          : item.title,
  };

  const rendered = Object.entries(tokens).reduce((result, [token, value]) => result.replaceAll(token, value), format);

  return rendered.trim() || "Nothing playing";
}

export function formatTrackRating(
  userRating?: number,
  displayMode: TrackRatingDisplayMode = getTrackRatingDisplayMode(),
): string | undefined {
  if (userRating === undefined || userRating <= 0) {
    return undefined;
  }

  const normalizedRating = Math.max(0, Math.min(10, userRating));
  const fiveStarRating = normalizedRating / 2;

  if (displayMode === "oneStar") {
    return "★";
  }

  if (displayMode === "fiveStarsHalf") {
    const roundedRating = Math.round(fiveStarRating * 2) / 2;
    const wholeStars = Math.floor(roundedRating);
    const hasHalfStar = roundedRating % 1 !== 0;
    const emptyStars = 5 - wholeStars - (hasHalfStar ? 1 : 0);

    return `${"★".repeat(wholeStars)}${hasHalfStar ? "½" : ""}${"☆".repeat(emptyStars)}`;
  }

  const wholeStars = Math.round(fiveStarRating);
  return `${"★".repeat(wholeStars)}${"☆".repeat(5 - wholeStars)}`;
}

export function formatTrackDisplayTitle(
  title: string,
  options?: {
    parentIndex?: number;
    index?: number;
    userRating?: number;
    displayMode?: TrackRatingDisplayMode;
  },
): string {
  const prefix = formatTrackTitlePrefix(options?.parentIndex, options?.index);
  const rating = formatTrackRating(options?.userRating, options?.displayMode);

  return `${prefix}${title}${rating ? ` ${rating}` : ""}`;
}

export function formatTrackAudioFormat(format?: string): string | undefined {
  const normalized = format?.trim().replace(/[_-]+/g, " ");

  if (!normalized) {
    return undefined;
  }

  return normalized === normalized.toLowerCase() ? normalized.toUpperCase() : normalized;
}

export function formatTrackBitrate(bitrate?: number): string | undefined {
  if (!bitrate || bitrate <= 0) {
    return undefined;
  }

  return `${Math.round(bitrate)}kbps`;
}

export function formatTrackMetadataBadge(track: Pick<MusicTrack, "audioFormat" | "bitrate">): string | undefined {
  const formattedFormat = formatTrackAudioFormat(track.audioFormat);
  const formattedBitrate = formatTrackBitrate(track.bitrate);

  if (formattedFormat && formattedBitrate) {
    return `${formattedFormat}-${formattedBitrate}`;
  }

  return formattedFormat ?? formattedBitrate;
}

export function getTrackAccessoryValues(
  track: Pick<MusicTrack, "audioFormat" | "bitrate" | "duration">,
  options?: { durationText?: string },
): { metadataBadge?: string; durationText?: string } {
  const durationText = options?.durationText
    ? options.durationText
    : track.duration
      ? formatDuration(track.duration)
      : undefined;

  return {
    metadataBadge: formatTrackMetadataBadge(track),
    durationText,
  };
}
