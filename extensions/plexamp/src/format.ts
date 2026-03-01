import { getPreferenceValues } from "@raycast/api";

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

export function formatTrackNumber(
  parentIndex?: number,
  index?: number,
): string | undefined {
  if (!index) {
    return undefined;
  }

  return parentIndex ? `${parentIndex}.${index}` : String(index);
}

export function formatTrackTitlePrefix(
  parentIndex?: number,
  index?: number,
): string {
  if (!index) {
    return "";
  }

  if (parentIndex) {
    return `${parentIndex}.${String(index).padStart(2, "0")} `;
  }

  return `${String(index).padStart(2, "0")} `;
}

export type TrackRatingDisplayMode = "fiveStars" | "fiveStarsHalf" | "oneStar";

interface RatingPreferences {
  trackRatings?: TrackRatingDisplayMode;
}

export function getTrackRatingDisplayMode(): TrackRatingDisplayMode {
  const value = getPreferenceValues<RatingPreferences>().trackRatings;

  if (value === "fiveStarsHalf" || value === "oneStar") {
    return value;
  }

  return "fiveStars";
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
