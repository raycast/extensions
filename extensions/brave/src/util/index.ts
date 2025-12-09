import path from "path";
import {
  DEFAULT_BRAVE_PROFILE_ID,
  defaultBraveProfilePath,
  defaultBraveBetaProfilePath,
  defaultBraveNightlyProfilePath,
  defaultBraveStatePath,
} from "../constants";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, HistoryEntry } from "../interfaces";

const { browserOption } = getPreferenceValues<Preferences>();

// Fuzzy match with scoring - returns a score (higher = better match), or -1 if no match
export function fuzzyScore(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Exact match gets highest score
  if (lowerText === lowerQuery) return 10000;

  // Contains exact substring gets high score
  const exactIndex = lowerText.indexOf(lowerQuery);
  if (exactIndex !== -1) {
    // Bonus for match at start
    const startBonus = exactIndex === 0 ? 500 : 0;
    // Bonus for match at word boundary
    const wordBoundaryBonus = exactIndex === 0 || /\W/.test(lowerText[exactIndex - 1]) ? 200 : 0;
    return 1000 + startBonus + wordBoundaryBonus - exactIndex;
  }

  // Fuzzy match with scoring
  let queryIndex = 0;
  let score = 0;
  let consecutiveBonus = 0;
  let lastMatchIndex = -2;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      // Base score for each matched character
      score += 10;

      // Bonus for consecutive matches
      if (i === lastMatchIndex + 1) {
        consecutiveBonus += 5;
        score += consecutiveBonus;
      } else {
        consecutiveBonus = 0;
      }

      // Bonus for match at start of text
      if (i === 0) score += 50;

      // Bonus for match at word boundary (after space, /, ., -, _)
      if (i > 0 && /[\s/._-]/.test(lowerText[i - 1])) score += 30;

      lastMatchIndex = i;
      queryIndex++;
    }
  }

  // Return -1 if not all characters matched
  if (queryIndex !== lowerQuery.length) return -1;

  return score;
}

// Filter and sort entries by fuzzy match score
export function filterAndSortEntries(entries: HistoryEntry[], query: string): HistoryEntry[] {
  if (!query?.trim()) return entries;

  const terms = query.trim().split(/\s+/);

  const scored = entries
    .map((entry) => {
      let totalScore = 0;
      for (const term of terms) {
        const titleScore = fuzzyScore(entry.title || "", term);
        const urlScore = fuzzyScore(entry.url || "", term);
        const bestScore = Math.max(titleScore, urlScore);

        if (bestScore < 0) return { entry, score: -1 };
        totalScore += bestScore;
      }
      return { entry, score: totalScore };
    })
    .filter((item) => item.score >= 0);

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.map((item) => item.entry);
}

let prefProfile: string[];

switch (browserOption) {
  case "Brave Browser Beta":
    prefProfile = defaultBraveBetaProfilePath;
    break;
  case "Brave Browser Nightly":
    prefProfile = defaultBraveNightlyProfilePath;
    break;
  default:
    prefProfile = defaultBraveProfilePath;
}

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

export const getHistoryDbPath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...prefProfile, profile ?? DEFAULT_BRAVE_PROFILE_ID, "History");

export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...defaultBraveStatePath);

export const getBookmarksFilePath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...prefProfile, profile ?? DEFAULT_BRAVE_PROFILE_ID, "Bookmarks");
