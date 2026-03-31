import { stat } from "fs/promises";
import { extname, join } from "path";

/**
 * Lightweight inline episode parser to avoid circular/heavy imports.
 * Extracts season and episode numbers from a filename.
 */
function parseSeasonEpisode(fileName: string): { season: number | null; episode: number | null } {
  const ext = extname(fileName);
  const name = fileName.slice(0, fileName.length - ext.length);

  // S01E01, s01e01
  const sxe = name.match(/[Ss](\d{1,2})[Ee](\d{1,3})/);
  if (sxe) return { season: parseInt(sxe[1]), episode: parseInt(sxe[2]) };

  // 1x01
  const cross = name.match(/(\d{1,2})x(\d{2,3})/i);
  if (cross) return { season: parseInt(cross[1]), episode: parseInt(cross[2]) };

  // [Group] Name - 01 (anime, no season)
  const anime = name.match(/^\[.*?\]\s*.+\s*-\s*(\d{2,4})\b/);
  if (anime) return { season: null, episode: parseInt(anime[1]) };

  // E01 without season
  const eOnly = name.match(/[Ee](\d{1,3})\b/);
  if (eOnly) return { season: null, episode: parseInt(eOnly[1]) };

  // Episode 01
  const verbose = name.match(/(?:Episode|Ep\.?|EP)\s*(\d{1,4})\b/i);
  if (verbose) return { season: null, episode: parseInt(verbose[1]) };

  // Pure number: 001.mkv
  const pure = name.match(/^(\d{1,4})$/);
  if (pure) return { season: null, episode: parseInt(pure[1]) };

  // Leading number: 01 - Title
  const leading = name.match(/^(\d{1,4})\s*[.\s_-]+/);
  if (leading) return { season: null, episode: parseInt(leading[1]) };

  return { season: null, episode: null };
}

export type RenameMode =
  | "tv-show"
  | "anime"
  | "movie"
  | "sequential"
  | "date"
  | "find-replace"
  | "change-extension"
  | "change-case"
  | "swap-delimiter"
  | "enumerate";

export interface RenameOptions {
  mode: RenameMode;
  // TV show mode
  showName?: string;
  overrideSeason?: boolean; // force all files to the specified season/episode, ignoring filename info
  season?: number;
  startEpisode?: number;
  // Anime mode
  animeName?: string;
  animeSeason?: number;
  startAnimeEpisode?: number;
  group?: string;
  quality?: string;
  // Movie mode
  movieName?: string;
  year?: string;
  movieQuality?: string;
  // Sequential mode
  prefix?: string;
  startNumber?: number;
  zeroPad?: number;
  separator?: string;
  // Date mode
  dateFormat?: "YYYY-MM-DD" | "DD-MM-YYYY" | "MM-DD-YYYY";
  datePrefix?: string;
  // Word delimiter (space, dot, underscore, dash, or custom)
  wordDelimiter?: string;
  // Suffix after SxxExx (e.g. "1080p", "PROPER")
  suffix?: string;
  // Change extension mode
  fromExtension?: string; // filter: only change files with this extension (empty = all)
  toExtension?: string;
  // Change case mode
  caseType?: "uppercase" | "lowercase" | "titlecase" | "sentencecase";
  fixSpaces?: boolean; // collapse multiple spaces into one
  // Swap delimiter mode
  fromDelimiter?: string;
  toDelimiter?: string;
  // Enumerate mode
  enumPrefix?: string;
  enumStart?: number;
  enumPad?: number;
  enumSeparator?: string;
  enumSortBy?: "name" | "created" | "modified" | "size" | "name-length";
  // Find & Replace mode
  find?: string;
  replace?: string;
  useRegex?: boolean;
}

export interface RenamePreview {
  original: string;
  renamed: string;
}

function padNumber(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

function formatDate(date: Date, format: string): string {
  const y = date.getFullYear().toString();
  const m = padNumber(date.getMonth() + 1, 2);
  const d = padNumber(date.getDate(), 2);
  const hh = padNumber(date.getHours(), 2);
  const mm = padNumber(date.getMinutes(), 2);
  const ss = padNumber(date.getSeconds(), 2);

  switch (format) {
    case "DD-MM-YYYY":
      return `${d}-${m}-${y}_${hh}-${mm}-${ss}`;
    case "MM-DD-YYYY":
      return `${m}-${d}-${y}_${hh}-${mm}-${ss}`;
    case "YYYY-MM-DD":
    default:
      return `${y}-${m}-${d}_${hh}-${mm}-${ss}`;
  }
}

// TV Show: Breaking Bad S01E01 1080p.mkv (delimiter & suffix configurable)
export function generateTvShowName(
  fileName: string,
  showName: string,
  season: number,
  episode: number,
  delimiter = " ",
  suffix = "",
): string {
  const ext = extname(fileName);
  const sanitized = showName.replace(/\s+/g, delimiter);
  const suffixPart = suffix ? `${delimiter}${suffix}` : "";
  return `${sanitized}${delimiter}S${padNumber(season, 2)}E${padNumber(episode, 2)}${suffixPart}${ext}`;
}

// Anime: [SubGroup] Anime Name - 01 [1080p].mkv
export function generateAnimeName(
  fileName: string,
  animeName: string,
  episode: number,
  group: string,
  quality: string,
): string {
  const ext = extname(fileName);
  const groupTag = group ? `[${group}] ` : "";
  const qualityTag = quality ? ` [${quality}]` : "";
  return `${groupTag}${animeName} - ${padNumber(episode, 2)}${qualityTag}${ext}`;
}

// Movie: Movie Name 2026 1080p.mkv (delimiter configurable)
export function generateMovieName(
  fileName: string,
  movieName: string,
  year: string,
  quality: string,
  delimiter = " ",
): string {
  const ext = extname(fileName);
  const sanitized = movieName.replace(/\s+/g, delimiter);
  const parts = [sanitized];
  if (year) parts.push(year);
  if (quality) parts.push(quality);
  return parts.join(delimiter) + ext;
}

// Sequential: Prefix-001.ext
export function generateSequentialName(
  fileName: string,
  prefix: string,
  number: number,
  zeroPad: number,
  separator: string,
): string {
  const ext = extname(fileName);
  return `${prefix}${separator}${padNumber(number, zeroPad)}${ext}`;
}

// Date: Prefix-2026-03-30_14-30-00-001.ext
export async function generateDateName(
  filePath: string,
  fileName: string,
  dateFormat: string,
  prefix: string,
  index: number,
): Promise<string> {
  const ext = extname(fileName);
  try {
    const stats = await stat(filePath);
    const date = stats.birthtime.getTime() > 0 ? stats.birthtime : stats.mtime;
    const dateStr = formatDate(date, dateFormat);
    const prefixStr = prefix ? `${prefix}-` : "";
    return `${prefixStr}${dateStr}-${padNumber(index + 1, 3)}${ext}`;
  } catch {
    const prefixStr = prefix ? `${prefix}-` : "";
    return `${prefixStr}unknown-${padNumber(index + 1, 3)}${ext}`;
  }
}

// Change extension: photo.jpeg → photo.jpg
export function generateChangedExtension(fileName: string, fromExt: string, toExt: string): string {
  const ext = extname(fileName).toLowerCase();
  const normalizedFrom = fromExt ? (fromExt.startsWith(".") ? fromExt.toLowerCase() : `.${fromExt.toLowerCase()}`) : "";
  const normalizedTo = toExt.startsWith(".") ? toExt : `.${toExt}`;

  // If fromExt is set, only change files that match
  if (normalizedFrom && ext !== normalizedFrom) {
    return fileName; // unchanged
  }

  const nameWithoutExt = fileName.slice(0, fileName.length - extname(fileName).length);
  return nameWithoutExt + normalizedTo;
}

// Case conversion (operates on filename without extension)
const TITLE_CASE_LOWERCASE = new Set([
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

export function generateCaseName(fileName: string, caseType: string, fixSpaces: boolean): string {
  const ext = extname(fileName);
  let name = fileName.slice(0, fileName.length - ext.length);

  if (fixSpaces) {
    name = name.replace(/\s{2,}/g, " ").trim();
  }

  switch (caseType) {
    case "uppercase":
      name = name.toUpperCase();
      break;
    case "lowercase":
      name = name.toLowerCase();
      break;
    case "titlecase":
      name = name
        .split(/(\s+)/)
        .map((part, i) => {
          if (/^\s+$/.test(part)) return part; // preserve whitespace
          const lower = part.toLowerCase();
          if (i > 0 && TITLE_CASE_LOWERCASE.has(lower)) return lower;
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join("");
      break;
    case "sentencecase":
      name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      break;
  }

  return name + ext;
}

// Swap delimiters in filename (e.g. dots to spaces, underscores to dashes)
export function generateSwapDelimiterName(fileName: string, fromDel: string, toDel: string): string {
  const ext = extname(fileName);
  let name = fileName.slice(0, fileName.length - ext.length);

  if (fromDel) {
    // Escape for regex
    const escaped = fromDel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    name = name.replace(new RegExp(escaped, "g"), toDel);
  }

  return name + ext;
}

// Enumerate: prefix-001.ext (index passed in, sorting handled externally)
export function generateEnumerateName(
  fileName: string,
  prefix: string,
  index: number,
  pad: number,
  separator: string,
): string {
  const ext = extname(fileName);
  const num = String(index).padStart(pad, "0");
  if (prefix) {
    return `${prefix}${separator}${num}${ext}`;
  }
  return `${num}${ext}`;
}

// Find & Replace on the filename (preserves extension)
export function generateFindReplaceName(fileName: string, find: string, replace: string, useRegex: boolean): string {
  const ext = extname(fileName);
  const nameWithoutExt = fileName.slice(0, fileName.length - ext.length);

  let newName: string;
  if (useRegex) {
    try {
      const regex = new RegExp(find, "g");
      newName = nameWithoutExt.replace(regex, replace);
    } catch {
      newName = nameWithoutExt; // invalid regex, no change
    }
  } else {
    newName = nameWithoutExt.split(find).join(replace);
  }

  return newName + ext;
}

export async function generatePreviews(
  folderPath: string,
  files: string[],
  options: RenameOptions,
): Promise<RenamePreview[]> {
  const previews: RenamePreview[] = [];

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    let renamed: string;

    switch (options.mode) {
      case "tv-show": {
        // If override is on, force the specified season and sequential episodes
        // If off, try to detect season/episode from the existing filename
        const tvParsed = options.overrideSeason ? null : parseSeasonEpisode(fileName);
        const tvSeason = tvParsed?.season ?? options.season ?? 1;
        const tvEpisode = tvParsed?.episode ?? (options.startEpisode ?? 1) + i;
        renamed = generateTvShowName(
          fileName,
          options.showName || "Show",
          tvSeason,
          tvEpisode,
          options.wordDelimiter ?? " ",
          options.suffix ?? "",
        );
        break;
      }
      case "anime": {
        const animeParsed = parseSeasonEpisode(fileName);
        const animeEpisode = animeParsed.episode ?? (options.startAnimeEpisode ?? 1) + i;
        renamed = generateAnimeName(
          fileName,
          options.animeName || "Anime",
          animeEpisode,
          options.group ?? "",
          options.quality ?? "",
        );
        break;
      }
      case "movie":
        renamed = generateMovieName(
          fileName,
          options.movieName || "Movie",
          options.year ?? "",
          options.movieQuality ?? "",
          options.wordDelimiter ?? " ",
        );
        break;
      case "sequential":
        renamed = generateSequentialName(
          fileName,
          options.prefix || "file",
          (options.startNumber ?? 1) + i,
          options.zeroPad ?? 3,
          options.separator ?? "-",
        );
        break;
      case "date":
        renamed = await generateDateName(
          join(folderPath, fileName),
          fileName,
          options.dateFormat ?? "YYYY-MM-DD",
          options.datePrefix ?? "",
          i,
        );
        break;
      case "find-replace":
        renamed = generateFindReplaceName(
          fileName,
          options.find ?? "",
          options.replace ?? "",
          options.useRegex ?? false,
        );
        break;
      case "change-extension":
        renamed = generateChangedExtension(fileName, options.fromExtension ?? "", options.toExtension ?? "");
        break;
      case "change-case":
        renamed = generateCaseName(fileName, options.caseType ?? "lowercase", options.fixSpaces ?? true);
        break;
      case "swap-delimiter":
        renamed = generateSwapDelimiterName(fileName, options.fromDelimiter ?? ".", options.toDelimiter ?? " ");
        break;
      case "enumerate":
        renamed = generateEnumerateName(
          fileName,
          options.enumPrefix ?? "",
          (options.enumStart ?? 1) + i,
          options.enumPad ?? 3,
          options.enumSeparator ?? "-",
        );
        break;
    }

    previews.push({ original: fileName, renamed });
  }

  return previews;
}
