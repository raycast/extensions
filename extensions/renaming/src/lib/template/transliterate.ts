/**
 * Unicode to ASCII transliteration
 *
 * Uses the `transliteration` npm package for comprehensive Unicode coverage
 * across all scripts (Latin, Cyrillic, CJK, Arabic, Greek, etc.).
 */

import { transliterate as tr } from "transliteration";

export interface TransliterateOptions {
  /** Remove characters that can't be mapped to ASCII (default: false) */
  removeUnmapped?: boolean;
}

export interface SanitizeOptions {
  /** Apply full transliteration (default: true) */
  transliterate?: boolean;
  /** Remove accents only, without full transliteration (default: true) */
  removeAccents?: boolean;
  /** Replace spaces with a character (default: false) */
  replaceSpaces?: boolean;
  /** Character to use when replacing spaces (default: "_") */
  spaceReplacement?: string;
}

export interface TransliterationPreview {
  original: string;
  transliterated: string;
  changed: boolean;
  changedChars: Array<{ original: string; replacement: string }>;
}

/**
 * Transliterate a string from Unicode to ASCII
 *
 * @param str - Input string with possible Unicode characters
 * @param options - Transliteration options
 * @returns ASCII-safe string
 *
 * @example
 * transliterate("café naïve") // "cafe naive"
 * transliterate("Ångström") // "Angstrom"
 * transliterate("日本語", { removeUnmapped: true }) // ""
 */
export function transliterate(str: string, options: TransliterateOptions = {}): string {
  const { removeUnmapped = false } = options;

  return tr(str, {
    unknown: removeUnmapped ? "" : undefined,
  });
}

/**
 * Remove diacritics (accents) from a string
 *
 * Uses Unicode normalization to decompose characters and then
 * strips the combining diacritical marks.
 *
 * @param str - Input string
 * @returns String with diacritics removed
 *
 * @example
 * removeAccents("café") // "cafe"
 * removeAccents("naïve") // "naive"
 */
export function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Check if a string contains non-ASCII characters
 *
 * @param str - String to check
 * @returns true if string contains non-ASCII characters
 */
export function hasNonAscii(str: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(str);
}

/**
 * Check if a string contains accented characters
 *
 * @param str - String to check
 * @returns true if string contains accented characters
 */
export function hasAccents(str: string): boolean {
  const normalized = str.normalize("NFD");
  return /[\u0300-\u036f]/.test(normalized);
}

/**
 * Sanitize a filename by transliterating and removing invalid characters
 *
 * @param filename - Filename to sanitize
 * @param options - Sanitization options
 * @returns Sanitized filename safe for most filesystems
 */
export function sanitizeFilename(filename: string, options: SanitizeOptions = {}): string {
  const {
    transliterate: doTransliterate = true,
    removeAccents: doRemoveAccents = true,
    replaceSpaces = false,
    spaceReplacement = "_",
  } = options;

  let result = filename;

  // First, transliterate if requested
  if (doTransliterate) {
    result = transliterate(result, { removeUnmapped: false });
  } else if (doRemoveAccents) {
    result = removeAccents(result);
  }

  // Remove characters that are invalid in filenames
  // Windows: \ / : * ? " < > |
  // macOS/Linux: / and null
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[\\/:*?"<>|\x00]/g, "");

  // Replace spaces if requested
  if (replaceSpaces) {
    result = result.replace(/\s+/g, spaceReplacement);
    // Re-sanitize in case spaceReplacement introduced invalid characters
    // eslint-disable-next-line no-control-regex
    result = result.replace(/[\\/:*?"<>|\x00]/g, "");
  }

  // Remove leading/trailing spaces and dots
  result = result.replace(/^[\s.]+|[\s.]+$/g, "");

  // Ensure we have something left
  if (result.length === 0) {
    result = "unnamed";
  }

  return result;
}

/**
 * Get a preview of what transliteration will do to a string
 *
 * Compares input and output character-by-character to identify changes.
 *
 * @param str - Input string
 * @returns Object with original, transliterated, and changes info
 */
export function getTransliterationPreview(str: string): TransliterationPreview {
  const transliterated = transliterate(str);
  const changed = str !== transliterated;
  const changedChars: Array<{ original: string; replacement: string }> = [];

  if (changed) {
    // Walk through original string and find characters that changed
    const seen = new Set<string>();
    for (const original of str) {
      if ((original.codePointAt(0) ?? 0) >= 128 && !seen.has(original)) {
        seen.add(original);
        const replacement = tr(original);
        if (replacement !== original) {
          changedChars.push({ original, replacement });
        }
      }
    }
  }

  return {
    original: str,
    transliterated,
    changed,
    changedChars,
  };
}
