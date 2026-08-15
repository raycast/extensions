import { SEARCH_ENGINES } from "../constants";
import { Preferences } from "../types";

export function isLikelyUrl(input: string): boolean {
  const value = input.trim();
  if (!value || /\s/.test(value)) return false;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) return true;
  if (/^localhost(?::\d+)?(?:\/|$)/i.test(value)) return true;
  return /^(?:[\p{L}\d](?:[\p{L}\d-]*[\p{L}\d])?\.)+[\p{L}]{2,}(?::\d+)?(?:\/|$)/iu.test(value);
}

export function normalizeUrl(input: string): string {
  const value = input.trim();
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}

export function resolveInput(input: string, engine: Preferences["searchEngine"]): string {
  const value = input.trim();
  if (!value) throw new Error("Enter a URL or search query.");
  return isLikelyUrl(value) ? normalizeUrl(value) : `${SEARCH_ENGINES[engine]}${encodeURIComponent(value)}`;
}
