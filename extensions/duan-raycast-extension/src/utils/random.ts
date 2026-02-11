import { getPreferenceValues } from "@raycast/api";

const DEFAULT_SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const DEFAULT_SLUG_LENGTH = "4";

export function generateRandomSlug(): string {
  const preferences = getPreferenceValues<Preferences>();
  const chars = preferences.slugChars || DEFAULT_SLUG_CHARS;
  const length = Number.parseInt(preferences.slugLength || DEFAULT_SLUG_LENGTH, 10);

  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
}
