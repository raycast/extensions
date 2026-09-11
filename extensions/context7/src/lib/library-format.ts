import { Color, Icon, List } from "@raycast/api";

import type { LibrarySummary } from "./types";

const WEBSITE_PREFIX = "/websites";
const LLMSTXT_PREFIX = "/llmstxt";

export function getLibraryIcon(libraryId: string) {
  if (libraryId.startsWith(WEBSITE_PREFIX)) {
    return Icon.Globe;
  }

  if (libraryId.startsWith(LLMSTXT_PREFIX)) {
    return Icon.BlankDocument;
  }

  return Icon.Code;
}

export function formatLibraryIdentifier(libraryId: string) {
  if (libraryId.startsWith(WEBSITE_PREFIX)) {
    return libraryId.replace(/^\/websites\/?/, "");
  }

  if (libraryId.startsWith(LLMSTXT_PREFIX)) {
    return libraryId.replace(/^\/llmstxt\/?/, "");
  }

  return libraryId;
}

/** Title-cases the last path segment of a library ID, e.g. `/websites/developer_apple_design` → `Developer Apple Design`. */
export function formatLibraryLabel(libraryId: string) {
  const segments = libraryId.split("/").filter(Boolean);
  const rawLabel = segments.at(-1) ?? libraryId;

  return rawLabel.replace(/[._-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Always rendered, filled or hollow, so saved state is readable without opening the action
 * panel. Only the saved state carries color — a colored hollow star draws the eye to every
 * row the user has *not* chosen, which is backwards. One star for libraries and snippets
 * alike: same gesture, same meaning, two object types.
 */
export function buildSavedAccessory(isSaved: boolean): List.Item.Accessory {
  return {
    icon: {
      source: isSaved ? Icon.Star : Icon.StarDisabled,
      tintColor: isSaved ? Color.Yellow : Color.SecondaryText,
    },
    tooltip: isSaved ? "In My Libraries" : "Not Saved",
  };
}

/** The failure mode of a cached snapshot is silent staleness, so its age is a first-class accessory. */
export function buildCapturedAccessory(isoDate: string | undefined, label: string): List.Item.Accessory | undefined {
  if (!isoDate) {
    return undefined;
  }

  const date = new Date(isoDate);

  return Number.isNaN(date.getTime()) ? undefined : { date, tooltip: label };
}

export function buildLibraryAccessories(library: LibrarySummary) {
  const accessories: List.Item.Accessory[] = [];

  const trustScore = buildTrustScoreAccessory(library.trustScore);
  if (trustScore) {
    accessories.push(trustScore);
  }

  if (typeof library.totalSnippets === "number") {
    accessories.push({
      icon: Icon.CodeBlock,
      text: formatCompactNumber(library.totalSnippets),
      tooltip: `${library.totalSnippets.toLocaleString("en-US")} snippets`,
    });
  }

  const updatedAt = buildUpdatedAtAccessory(library.lastUpdateDate);
  if (updatedAt) {
    accessories.push(updatedAt);
  }

  return accessories;
}

function buildUpdatedAtAccessory(lastUpdateDate?: string): List.Item.Accessory | undefined {
  if (!lastUpdateDate) {
    return undefined;
  }

  const parsedDate = new Date(lastUpdateDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return {
    date: parsedDate,
    tooltip: `Updated: ${new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsedDate)}`,
  };
}

function buildTrustScoreAccessory(trustScore?: number): List.Item.Accessory | undefined {
  if (typeof trustScore !== "number") {
    return undefined;
  }

  return {
    tag: {
      value: trustScore.toFixed(1),
      color: getTrustScoreColor(trustScore),
    },
    tooltip: `Trust score: ${trustScore.toFixed(1)}`,
  };
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function getTrustScoreColor(trustScore: number) {
  if (trustScore >= 9) {
    return Color.Green;
  }

  if (trustScore >= 7) {
    return Color.Orange;
  }

  return Color.Red;
}
