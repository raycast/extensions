import { Color } from "@raycast/api";

export function formatCompactNumber(value?: number): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(date);
}

export function formatScoreOutOf100(value?: number): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return `${(value * 100).toFixed(1)}/100`;
}

/**
 * Returns a display color for a 0–1 score value.
 * Scores at or above 0.75 are green, at or above 0.5 are orange, below are red.
 * Returns SecondaryText when no score is available.
 */
export function scoreToColor(score: number | undefined): Color {
  if (score === undefined) {
    return Color.SecondaryText;
  }
  if (score >= 0.75) {
    return Color.Green;
  }
  if (score >= 0.5) {
    return Color.Orange;
  }
  return Color.Red;
}
