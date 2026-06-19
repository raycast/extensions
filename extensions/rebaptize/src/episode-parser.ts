import { extname } from "path";

export interface ParsedEpisode {
  fileName: string;
  episodeNumber: number;
  seasonNumber: number | null; // null = could not determine
  showName: string | null; // extracted from filename if possible
}

/**
 * Patterns tried in order of specificity.
 * Each returns { episode, season?, showName? } or null.
 */
const PATTERNS: {
  name: string;
  regex: RegExp;
  extract: (
    match: RegExpMatchArray,
    fileName: string,
  ) => { episode: number; season: number | null; showName: string | null };
}[] = [
  // S01E01, s01e01, S1E5
  {
    name: "SxxExx",
    regex: /^(.*?)[.\s_-]*[Ss](\d{1,2})[Ee](\d{1,3})/,
    extract: (m) => ({
      episode: parseInt(m[3]),
      season: parseInt(m[2]),
      showName: cleanShowName(m[1]),
    }),
  },
  // 1x01, 01x05
  {
    name: "1x01",
    regex: /^(.*?)[.\s_-]*(\d{1,2})x(\d{2,3})/i,
    extract: (m) => ({
      episode: parseInt(m[3]),
      season: parseInt(m[2]),
      showName: cleanShowName(m[1]),
    }),
  },
  // [SubGroup] Show Name - 01 [1080p] (anime style)
  {
    name: "anime-bracket",
    regex: /^\[.*?\]\s*(.*?)\s*-\s*(\d{2,4})\b/,
    extract: (m) => ({
      episode: parseInt(m[2]),
      season: null,
      showName: m[1].trim() || null,
    }),
  },
  // Show.Name.E01 or Show Name - E01
  {
    name: "E-only",
    regex: /^(.*?)[.\s_-]*[Ee](\d{1,3})\b/,
    extract: (m) => ({
      episode: parseInt(m[2]),
      season: null,
      showName: cleanShowName(m[1]),
    }),
  },
  // Episode 01, Episode 1
  {
    name: "episode-word",
    regex: /^(.*?)[.\s_-]*(?:Episode|Ep\.?|EP)\s*(\d{1,4})\b/i,
    extract: (m) => ({
      episode: parseInt(m[2]),
      season: null,
      showName: cleanShowName(m[1]),
    }),
  },
  // Show Name - 001 (bare number after separator)
  {
    name: "bare-after-separator",
    regex: /^(.*?)\s*[-–]\s*(\d{1,4})\s*(?:\[.*?\])*\s*$/,
    extract: (m) => ({
      episode: parseInt(m[2]),
      season: null,
      showName: cleanShowName(m[1]),
    }),
  },
  // Pure numeric: 001.mkv, 01.mp4 (entire filename minus extension is a number)
  {
    name: "pure-number",
    regex: /^(\d{1,4})$/,
    extract: (m) => ({
      episode: parseInt(m[1]),
      season: null,
      showName: null,
    }),
  },
  // Starts with number: 01 - Title.mkv, 001 Something.mkv
  {
    name: "leading-number",
    regex: /^(\d{1,4})\s*[.\s_-]+/,
    extract: (m) => ({
      episode: parseInt(m[1]),
      season: null,
      showName: null,
    }),
  },
  // Ends with number: Something_01.mkv
  {
    name: "trailing-number",
    regex: /[_.\s-](\d{1,4})$/,
    extract: (m) => ({
      episode: parseInt(m[1]),
      season: null,
      showName: null,
    }),
  },
];

function cleanShowName(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\[.*?\]\s*/, "") // remove leading [group]
    .trim();
  return cleaned || null;
}

/**
 * Try to extract episode info from a filename.
 */
export function parseEpisode(fileName: string): ParsedEpisode | null {
  const ext = extname(fileName);
  const nameWithoutExt = fileName.slice(0, fileName.length - ext.length);

  for (const pattern of PATTERNS) {
    const match = nameWithoutExt.match(pattern.regex);
    if (match) {
      const result = pattern.extract(match, nameWithoutExt);
      return {
        fileName,
        episodeNumber: result.episode,
        seasonNumber: result.season,
        showName: result.showName,
      };
    }
  }

  return null;
}

/**
 * Given a flat list of episode numbers (e.g. 1-50), figure out seasons.
 * seasonEpCounts = array of episode counts per season, e.g. [7, 13, 13] for 3 seasons.
 * Returns a map of absolute episode number -> { season, episodeInSeason }.
 */
export function assignSeasons(
  episodes: number[],
  seasonEpCounts: number[],
): Map<number, { season: number; episodeInSeason: number }> {
  const sorted = [...episodes].sort((a, b) => a - b);
  const result = new Map<number, { season: number; episodeInSeason: number }>();

  // Build season boundaries from the counts
  // e.g. [7, 13, 13] -> season 1 = eps 1-7, season 2 = eps 8-20, season 3 = eps 21-33
  const boundaries: { season: number; start: number; end: number }[] = [];
  let cumulative = 0;
  for (let i = 0; i < seasonEpCounts.length; i++) {
    const start = cumulative + 1;
    const end = cumulative + seasonEpCounts[i];
    boundaries.push({ season: i + 1, start, end });
    cumulative = end;
  }

  for (const ep of sorted) {
    // Find which season this episode belongs to
    const boundary = boundaries.find((b) => ep >= b.start && ep <= b.end);
    if (boundary) {
      result.set(ep, {
        season: boundary.season,
        episodeInSeason: ep - boundary.start + 1,
      });
    } else {
      // Episode exceeds defined seasons — put it in the next season
      const lastSeason = boundaries.length > 0 ? boundaries[boundaries.length - 1] : null;
      if (lastSeason) {
        const overflow = ep - lastSeason.end;
        result.set(ep, {
          season: lastSeason.season + 1,
          episodeInSeason: overflow,
        });
      } else {
        result.set(ep, { season: 1, episodeInSeason: ep });
      }
    }
  }

  return result;
}

/**
 * Parse a season breakdown string like "7, 13, 13" into an array of numbers.
 */
export function parseSeasonBreakdown(input: string): number[] {
  return input
    .split(",")
    .map((s) => parseInt(s.trim()))
    .filter((n) => !isNaN(n) && n > 0);
}
