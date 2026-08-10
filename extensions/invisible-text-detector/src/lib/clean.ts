import { FILLERS_CLASS, INVISIBLE_CLASS, SPECIAL_SPACES_CLASS, ASCII_ALLOWED_IN_ALL } from "./sets";
import type { Preferences } from "./runtime";

export function fixInvisibleOnly(text: string): string {
  const re = new RegExp(`${INVISIBLE_CLASS}|${FILLERS_CLASS}`, "gu");
  return text.replace(re, "");
}

export function fixAllUnicode(text: string, prefs: Preferences): string {
  let result = text;

  // Replace special spaces
  if (prefs.replaceNBSPWithSpace) {
    result = result.replace(new RegExp(`${SPECIAL_SPACES_CLASS}`, "gu"), " ");
  }

  // Convert smart quotes and apostrophes
  if (prefs.convertSmartQuotes) {
    result = result.replace(/[\u2018\u2019]/gu, "'").replace(/[\u201C\u201D]/gu, '"');
  }

  // Convert en/em dashes
  if (prefs.convertDashes) {
    result = result.replace(/[\u2013\u2014]/gu, "-");
  }

  // Ellipsis
  if (prefs.replaceEllipsis) {
    result = result.replace(/\u2026/gu, "...");
  }

  // Tabs
  const tabWidth = Math.max(0, Number.parseInt(String(prefs.tabWidth || 4), 10) || 4);
  result = result.replace(/\t/gu, " ".repeat(tabWidth));

  // Remove invisible & fillers
  result = result.replace(new RegExp(`${INVISIBLE_CLASS}|${FILLERS_CLASS}`, "gu"), "");

  // Normalize NFKD and strip combining marks
  if (prefs.normalizeNFKD) {
    result = result.normalize("NFKD").replace(/\p{M}+/gu, "");
  }

  // Remove any remaining non-ASCII (except newline and spaces)
  result = [...result].filter((ch) => ASCII_ALLOWED_IN_ALL.test(ch)).join("");

  if (prefs.collapseMultipleSpaces) {
    result = result.replace(/ {2,}/g, " ");
  }
  return result;
}
