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
  enumKeepName?: boolean; // prepend/append number to original name instead of replacing
  enumPosition?: "before" | "after"; // number position relative to original name
  enumFormat?: "numeric" | "alpha" | "alpha-upper"; // numbering format
  enumSuffix?: string; // text after everything (before extension)
  // Custom template enumerate
  enumCustomTemplate?: boolean; // use custom template mode
  enumTemplate?: string; // template string with {1}, {2}, {3}, {name} placeholders
  enumCounters?: EnumCounter[]; // up to 3 counter configs
  // Find & Replace mode
  find?: string;
  replace?: string;
  useRegex?: boolean;
}

export interface EnumCounter {
  format: "numeric" | "alpha" | "alpha-upper";
  start: number;
  pad: number;
  every: number; // increment every N files (1 = every file)
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

// Convert a 1-based index to alphabetic: 1→A, 2→B, ..., 26→Z, 27→AA, 28→AB
function indexToAlpha(index: number, upper: boolean): string {
  let result = "";
  let n = index;
  while (n > 0) {
    n--;
    result = String.fromCharCode((upper ? 65 : 97) + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

export function formatIndex(index: number, format: string, pad: number): string {
  switch (format) {
    case "alpha":
      return indexToAlpha(index, false);
    case "alpha-upper":
      return indexToAlpha(index, true);
    case "numeric":
    default:
      return String(index).padStart(pad, "0");
  }
}

// Enumerate: flexible naming with optional original name preservation
export function generateEnumerateName(
  fileName: string,
  prefix: string,
  index: number,
  pad: number,
  separator: string,
  keepName = false,
  position: "before" | "after" = "before",
  format = "numeric",
  suffix = "",
): string {
  const ext = extname(fileName);
  const originalName = fileName.slice(0, fileName.length - ext.length);
  const num = formatIndex(index, format, pad);
  const suffixPart = suffix ? `${separator}${suffix}` : "";

  if (keepName) {
    if (position === "before") {
      const prefixPart = prefix ? `${prefix}${separator}` : "";
      return `${prefixPart}${num}${separator}${originalName}${suffixPart}${ext}`;
    } else {
      const prefixPart = prefix ? `${prefix}${separator}` : "";
      return `${prefixPart}${originalName}${separator}${num}${suffixPart}${ext}`;
    }
  }

  // Original behavior: replace name entirely
  if (prefix) {
    return `${prefix}${separator}${num}${suffixPart}${ext}`;
  }
  return `${num}${suffixPart}${ext}`;
}

// Custom template enumerate with multiple counters
// Template uses {1}, {2}, {3} for counters and {name} for original filename
export function generateTemplateEnumerateName(
  fileName: string,
  template: string,
  fileIndex: number,
  counters: EnumCounter[],
): string {
  const ext = extname(fileName);
  const originalName = fileName.slice(0, fileName.length - ext.length);

  let result = template;

  // Replace counter placeholders
  for (let c = 0; c < counters.length; c++) {
    const counter = counters[c];
    const every = Math.max(1, counter.every);
    // Calculate this counter's value: increments every N files
    const counterValue = counter.start + Math.floor(fileIndex / every);
    const formatted = formatIndex(counterValue, counter.format, counter.pad);
    result = result.replace(new RegExp(`\\{${c + 1}\\}`, "g"), formatted);
  }

  // Replace {name} placeholder
  result = result.replace(/\{name\}/g, originalName);

  return result + ext;
}

// ─── Utility rename functions ─────────────────────────────────────────────────

// Remove accents/diacritics: café → cafe, über → uber
export function removeAccents(fileName: string): string {
  const ext = extname(fileName);
  const name = fileName.slice(0, fileName.length - ext.length);
  const cleaned = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return cleaned + ext;
}

// Strip digits from filename
export function stripDigits(fileName: string): string {
  const ext = extname(fileName);
  const name = fileName.slice(0, fileName.length - ext.length);
  const cleaned = name
    .replace(/\d/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return (cleaned || name) + ext;
}

// Strip special characters (keep letters, digits, spaces, dashes, underscores)
export function stripSpecialChars(fileName: string): string {
  const ext = extname(fileName);
  const name = fileName.slice(0, fileName.length - ext.length);
  const cleaned = name
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return (cleaned || name) + ext;
}

// Trim leading/trailing whitespace, dashes, dots, underscores from filename
export function trimFilename(fileName: string): string {
  const ext = extname(fileName);
  const name = fileName.slice(0, fileName.length - ext.length);
  const cleaned = name.replace(/^[\s.\-_]+|[\s.\-_]+$/g, "");
  return (cleaned || name) + ext;
}

// Add zero padding to numbers in filename: file1 → file001
export function padNumbersInName(fileName: string, width = 3): string {
  const ext = extname(fileName);
  const name = fileName.slice(0, fileName.length - ext.length);
  const padded = name.replace(/\d+/g, (match) => match.padStart(width, "0"));
  return padded + ext;
}

// Remove zero padding from numbers: file001 → file1
export function unpadNumbersInName(fileName: string): string {
  const ext = extname(fileName);
  const name = fileName.slice(0, fileName.length - ext.length);
  const unpadded = name.replace(/\d+/g, (match) => String(parseInt(match)));
  return unpadded + ext;
}

// Prepend parent folder name: folder "NYC", file "img.jpg" → "NYC - img.jpg"
export function prependParentFolder(fileName: string, parentName: string, separator = " - "): string {
  return `${parentName}${separator}${fileName}`;
}

// Swap two parts around a separator: "Artist - Song" → "Song - Artist"
export function swapParts(fileName: string, separator = " - "): string {
  const ext = extname(fileName);
  const name = fileName.slice(0, fileName.length - ext.length);
  const idx = name.indexOf(separator);
  if (idx === -1) return fileName; // no separator found, no change
  const left = name.slice(0, idx);
  const right = name.slice(idx + separator.length);
  return `${right}${separator}${left}${ext}`;
}

// Transliterate common non-Latin characters to ASCII
const TRANSLIT_MAP: Record<string, string> = {
  // Cyrillic
  А: "A",
  Б: "B",
  В: "V",
  Г: "G",
  Д: "D",
  Е: "E",
  Ё: "Yo",
  Ж: "Zh",
  З: "Z",
  И: "I",
  Й: "Y",
  К: "K",
  Л: "L",
  М: "M",
  Н: "N",
  О: "O",
  П: "P",
  Р: "R",
  С: "S",
  Т: "T",
  У: "U",
  Ф: "F",
  Х: "Kh",
  Ц: "Ts",
  Ч: "Ch",
  Ш: "Sh",
  Щ: "Shch",
  Ъ: "",
  Ы: "Y",
  Ь: "",
  Э: "E",
  Ю: "Yu",
  Я: "Ya",
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  // German
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
  Ä: "Ae",
  Ö: "Oe",
  Ü: "Ue",
  // Nordic
  å: "a",
  Å: "A",
  æ: "ae",
  Æ: "AE",
  ø: "o",
  Ø: "O",
  // Polish
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ś: "s",
  ź: "z",
  ż: "z",
  Ą: "A",
  Ć: "C",
  Ę: "E",
  Ł: "L",
  Ń: "N",
  Ś: "S",
  Ź: "Z",
  Ż: "Z",
  // Turkish
  ğ: "g",
  ı: "i",
  ş: "s",
  Ğ: "G",
  İ: "I",
  Ş: "S",
  // Czech/Slovak
  č: "c",
  ď: "d",
  ě: "e",
  ň: "n",
  ř: "r",
  š: "s",
  ť: "t",
  ů: "u",
  ž: "z",
  Č: "C",
  Ď: "D",
  Ě: "E",
  Ň: "N",
  Ř: "R",
  Š: "S",
  Ť: "T",
  Ů: "U",
  Ž: "Z",
  // Romanian
  ă: "a",
  â: "a",
  î: "i",
  ș: "s",
  ț: "t",
  Ă: "A",
  Â: "A",
  Î: "I",
  Ș: "S",
  Ț: "T",
  // Portuguese/Spanish
  ã: "a",
  õ: "o",
  ñ: "n",
  Ã: "A",
  Õ: "O",
  Ñ: "N",
};

export function transliterate(fileName: string): string {
  const ext = extname(fileName);
  const name = fileName.slice(0, fileName.length - ext.length);
  // First remove diacritics via normalize, then apply manual map for remaining
  let result = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  result = result.replace(/./g, (ch) => TRANSLIT_MAP[ch] ?? ch);
  return result + ext;
}

// Insert text at a specific position in the filename
export function insertAtPosition(fileName: string, text: string, position: number, fromEnd = false): string {
  const ext = extname(fileName);
  const name = fileName.slice(0, fileName.length - ext.length);
  const pos = fromEnd ? Math.max(0, name.length - position) : Math.min(position, name.length);
  return name.slice(0, pos) + text + name.slice(pos) + ext;
}

// Remove characters at a specific position range
export function removeAtPosition(fileName: string, start: number, count: number, fromEnd = false): string {
  const ext = extname(fileName);
  const name = fileName.slice(0, fileName.length - ext.length);
  const s = fromEnd ? Math.max(0, name.length - start - count) : Math.min(start, name.length);
  const e = Math.min(s + count, name.length);
  return (name.slice(0, s) + name.slice(e) || name) + ext;
}

// ─── End utility rename functions ─────────────────────────────────────────────

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
        if (options.enumCustomTemplate && options.enumTemplate && options.enumCounters?.length) {
          renamed = generateTemplateEnumerateName(fileName, options.enumTemplate, i, options.enumCounters);
        } else {
          renamed = generateEnumerateName(
            fileName,
            options.enumPrefix ?? "",
            (options.enumStart ?? 1) + i,
            options.enumPad ?? 3,
            options.enumSeparator ?? "-",
            options.enumKeepName ?? true,
            options.enumPosition ?? "before",
            options.enumFormat ?? "numeric",
            options.enumSuffix ?? "",
          );
        }
        break;
    }

    previews.push({ original: fileName, renamed });
  }

  return previews;
}
