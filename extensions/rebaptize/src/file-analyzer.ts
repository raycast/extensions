import { readdir, stat } from "fs/promises";
import { join, extname, basename } from "path";
import { parseEpisode } from "./episode-parser";

export type SuggestedMode = "tv-show" | "anime" | "movie" | "sequential" | "date" | "find-replace" | "unknown";

export interface FileAnalysis {
  totalFiles: number;
  fileNames: string[];

  // Detected patterns
  suggestedMode: SuggestedMode;
  confidence: number; // 0-1

  // Show/media detection
  detectedShowName: string | null;
  detectedSeasons: number[];
  detectedEpisodeCount: number;
  hasSeasonInfo: boolean; // files contain SxxExx-style season numbers
  estimatedEpisodesPerSeason: number | null;

  // Common patterns
  commonPrefix: string | null; // shared prefix across filenames
  hasAnimeFormat: boolean;
  hasTvFormat: boolean;
  hasMovieFormat: boolean;
  hasMixedFormats: boolean;

  // File types
  extensions: Map<string, number>;
  dominantExtension: string | null;
}

function isHidden(name: string): boolean {
  return name.startsWith(".");
}

/**
 * Find the longest common prefix among an array of strings.
 */
function longestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return "";
  if (strings.length === 1) return strings[0];

  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix;
}

/**
 * Extract a likely show name from the common prefix.
 * Cleans up dots, underscores, trailing separators.
 */
function cleanPrefix(raw: string): string | null {
  let cleaned = raw
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[-\s]+$/, "")
    .trim();

  // Remove trailing partial words (if prefix ends mid-word)
  const words = cleaned.split(" ");
  if (words.length > 1 && words[words.length - 1].length <= 2) {
    words.pop();
    cleaned = words.join(" ");
  }

  // Remove common junk suffixes
  cleaned = cleaned
    .replace(/\s*(S\d*)$/i, "")
    .replace(/\s*-\s*$/, "")
    .trim();

  if (cleaned.length < 2) return null;

  return titleCase(cleaned);
}

// Words that should stay lowercase in titles (unless first word)
const LOWERCASE_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "nor",
  "for",
  "yet",
  "so",
  "in",
  "on",
  "at",
  "to",
  "by",
  "of",
  "up",
  "as",
  "is",
  "if",
  "it",
  "vs",
  "via",
]);

/**
 * Properly title-case a string.
 * Handles: "the show" → "The Show", "breaking bad" → "Breaking Bad",
 * "tHeShOw" → "Theshow" (treats as single word)
 */
export function titleCase(input: string): string {
  // First, split camelCase/PascalCase if it looks like one word with mixed case
  // e.g. "TheShow" → "The Show", "breakingBad" → "breaking Bad"
  const spaced = input.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Now split into words and title-case
  const words = spaced.split(/\s+/).filter((w) => w.length > 0);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      // First word is always capitalized
      if (i === 0) return lower.charAt(0).toUpperCase() + lower.slice(1);
      // Common lowercase words stay lowercase
      if (LOWERCASE_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

const ANIME_PATTERN = /^\[.*?\]\s*.+\s*-\s*\d+/;
const TV_PATTERN = /[Ss]\d{1,2}[Ee]\d{1,3}|\d{1,2}x\d{2,3}/;
const MOVIE_PATTERN = /\b(19|20)\d{2}\b.*\b(720|1080|2160|4k|bluray|brrip|dvdrip|webrip|web-dl)\b/i;

/**
 * Analyze files in a folder and suggest the best rename mode + auto-fill values.
 */
export async function analyzeFolder(folderPath: string): Promise<FileAnalysis> {
  const entries = await readdir(folderPath);
  const files: string[] = [];

  for (const entry of entries) {
    if (isHidden(entry)) continue;
    const s = await stat(join(folderPath, entry));
    if (s.isFile()) files.push(entry);
  }

  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  // Extension analysis
  const extensions = new Map<string, number>();
  for (const f of files) {
    const ext = extname(f).toLowerCase();
    extensions.set(ext, (extensions.get(ext) || 0) + 1);
  }
  let dominantExtension: string | null = null;
  let maxCount = 0;
  for (const [ext, count] of extensions) {
    if (count > maxCount) {
      maxCount = count;
      dominantExtension = ext;
    }
  }

  // Pattern detection
  let animeCount = 0;
  let tvCount = 0;
  let movieCount = 0;

  for (const f of files) {
    if (ANIME_PATTERN.test(f)) animeCount++;
    if (TV_PATTERN.test(f)) tvCount++;
    if (MOVIE_PATTERN.test(f)) movieCount++;
  }

  const hasAnimeFormat = animeCount > 0;
  const hasTvFormat = tvCount > 0;
  const hasMovieFormat = movieCount > 0;
  const formatTypes = [hasAnimeFormat, hasTvFormat, hasMovieFormat].filter(Boolean).length;
  const hasMixedFormats = formatTypes > 1;

  // Episode parsing
  const parsedEpisodes = files.map((f) => parseEpisode(f)).filter((p) => p !== null);
  const detectedEpisodeCount = parsedEpisodes.length;
  const hasSeasonInfo = parsedEpisodes.some((p) => p.seasonNumber !== null);
  const detectedSeasons = [
    ...new Set(parsedEpisodes.filter((p) => p.seasonNumber !== null).map((p) => p.seasonNumber!)),
  ].sort((a, b) => a - b);

  // Estimate episodes per season from detected data
  let estimatedEpisodesPerSeason: number | null = null;
  if (hasSeasonInfo && detectedSeasons.length > 0) {
    const seasonEpCounts = new Map<number, number>();
    for (const p of parsedEpisodes) {
      if (p.seasonNumber !== null) {
        seasonEpCounts.set(p.seasonNumber, (seasonEpCounts.get(p.seasonNumber) || 0) + 1);
      }
    }
    const counts = [...seasonEpCounts.values()];
    estimatedEpisodesPerSeason = Math.max(...counts);
  }

  // Common prefix / show name detection
  const namesWithoutExt = files.map((f) => {
    const ext = extname(f);
    return f.slice(0, f.length - ext.length).toLowerCase();
  });
  const rawPrefix = longestCommonPrefix(namesWithoutExt);
  const commonPrefix = rawPrefix.length >= 3 ? rawPrefix : null;

  // Try to detect show name from multiple sources
  let detectedShowName: string | null = null;

  // 1. From parsed episodes (most reliable)
  const showNames = parsedEpisodes.map((p) => p.showName).filter((n) => n !== null);
  if (showNames.length > 0) {
    // Pick the most common show name
    const nameCounts = new Map<string, number>();
    for (const n of showNames) {
      const lower = n.toLowerCase();
      nameCounts.set(lower, (nameCounts.get(lower) || 0) + 1);
    }
    let bestName = "";
    let bestCount = 0;
    for (const [name, count] of nameCounts) {
      if (count > bestCount) {
        bestName = name;
        bestCount = count;
      }
    }
    // Title-case the detected name
    const raw = showNames.find((n) => n.toLowerCase() === bestName) || bestName;
    detectedShowName = titleCase(raw.replace(/[._]/g, " ").replace(/\s+/g, " ").trim());
  }

  // 2. From common prefix as fallback
  if (!detectedShowName && commonPrefix) {
    detectedShowName = cleanPrefix(commonPrefix);
  }

  // 3. From folder name as last resort
  if (!detectedShowName) {
    const folderName = basename(folderPath);
    if (folderName && !["Downloads", "Desktop", "Documents", "tmp", "temp"].includes(folderName)) {
      detectedShowName = cleanPrefix(folderName);
    }
  }

  // Suggest mode
  let suggestedMode: SuggestedMode = "unknown";
  let confidence = 0;

  if (detectedEpisodeCount > files.length * 0.5) {
    // Majority of files look like episodes
    if (hasAnimeFormat && animeCount >= tvCount) {
      suggestedMode = "anime";
      confidence = animeCount / files.length;
    } else if (hasTvFormat) {
      suggestedMode = "tv-show";
      confidence = tvCount / files.length;
    } else if (detectedEpisodeCount > 3) {
      // Bare numbered files (like 001.mkv) — likely anime or tv
      suggestedMode = files.length > 15 ? "anime" : "tv-show";
      confidence = (detectedEpisodeCount / files.length) * 0.7;
    }
  } else if (hasMovieFormat && movieCount > 0) {
    suggestedMode = "movie";
    confidence = movieCount / files.length;
  } else if (files.length > 0) {
    // No clear pattern — suggest sequential or find-replace
    const allSameExt = extensions.size === 1;
    if (allSameExt && files.length > 3) {
      suggestedMode = "sequential";
      confidence = 0.4;
    } else {
      suggestedMode = "find-replace";
      confidence = 0.3;
    }
  }

  return {
    totalFiles: files.length,
    fileNames: files,
    suggestedMode,
    confidence,
    detectedShowName,
    detectedSeasons,
    detectedEpisodeCount,
    hasSeasonInfo,
    estimatedEpisodesPerSeason,
    commonPrefix,
    hasAnimeFormat,
    hasTvFormat,
    hasMovieFormat,
    hasMixedFormats,
    extensions,
    dominantExtension,
  };
}
