import { getPreferenceValues } from "@raycast/api";

/**
 * Simple utility for pluralizing words.
 */
export function pluralize(
  count: number,
  noun: string,
  { suffix = "s", withNumber = false }: { suffix?: string; withNumber?: boolean } = {},
): string {
  const pluralizedNoun = `${noun}${count !== 1 ? suffix : ""}`;
  return withNumber ? `${count} ${pluralizedNoun}` : pluralizedNoun;
}

/**
 * Get the label for the date field based on the sort preference.
 */
export function getDateLabel(): string | undefined {
  const sort = getPreferenceValues().sort;
  switch (sort) {
    case "created_date":
      return "Created Date";
    case "last_modified_date":
      return "Last Modified Date";
    case "last_opened_date":
      return "Last Opened Date";
    default:
      return undefined;
  }
}
