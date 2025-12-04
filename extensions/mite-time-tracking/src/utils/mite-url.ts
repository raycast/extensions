import { getPreferenceValues } from "@raycast/api";
import type { MitePreferences } from "../api/types";

/**
 * Normalizes mite URL by removing protocol and trailing slashes
 */
export function cleanMiteUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

/**
 * Generates mite daily view URL with optional entry ID and date
 * Format: https://example.mite.de/daily#2025/12/3?open=time_entry_123
 */
export function getMiteDailyUrl(entryId?: number, dateAt?: string): string {
  const preferences = getPreferenceValues<MitePreferences>();
  const miteUrl = cleanMiteUrl(preferences.miteUrl);

  // Use provided date or default to today
  let date: Date;
  if (dateAt) {
    date = new Date(dateAt);
  } else {
    date = new Date();
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let url = `https://${miteUrl}/daily#${year}/${month}/${day}`;

  // Append entry ID to open specific entry in edit mode
  if (entryId) {
    url += `?open=time_entry_${entryId}`;
  }

  return url;
}
