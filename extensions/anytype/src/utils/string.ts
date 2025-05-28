import { getPreferenceValues, Image } from "@raycast/api";
import emojiRegex from "emoji-regex";
import { MemberRole, SortProperty } from "../models";

/**
 * Simple utility for pluralizing words.
 */
export function pluralize(
  count: number,
  noun: string,
  { suffix = "s", withNumber = false }: { suffix?: string; withNumber?: boolean } = {},
): string {
  let pluralizedNoun;
  if (noun.endsWith("y") && count !== 1) {
    pluralizedNoun = `${noun.slice(0, -1)}ies`;
  } else {
    pluralizedNoun = `${noun}${count !== 1 ? suffix : ""}`;
  }
  return withNumber ? `${count} ${pluralizedNoun}` : pluralizedNoun;
}

/**
 * Get the label for the date field based on the sort preference.
 */
export function getDateLabel(): string {
  const { sort } = getPreferenceValues();
  switch (sort) {
    case SortProperty.CreatedDate:
      return "Creation Date";
    case SortProperty.LastModifiedDate:
      return "Last Modified Date";
    case SortProperty.LastOpenedDate:
      return "Last Opened Date";
    default:
      return "";
  }
}

/**
 * Get the short date label based on the sort preference.
 */
export function getShortDateLabel(): string {
  const { sort } = getPreferenceValues();
  switch (sort) {
    case SortProperty.CreatedDate:
      return "Created";
    case SortProperty.LastModifiedDate:
      return "Modified";
    case SortProperty.LastOpenedDate:
      return "Opened";
    default:
      return "";
  }
}

/**
 * Get the section title based on the search text and sort preference.
 */
export function getSectionTitle(searchText: string): string {
  const { sort } = getPreferenceValues();
  if (searchText) {
    return "Search Results";
  }
  if (sort === SortProperty.Name) {
    return "Alphabetical Order";
  }
  return `${getShortDateLabel()} Recently`;
}

/**
 * Format the member role to readable representation.
 */
export function formatMemberRole(role: string): string {
  return role
    .replace(MemberRole.Viewer, "Viewer")
    .replace(MemberRole.Editor, "Editor")
    .replace(MemberRole.Owner, "Owner")
    .replace(MemberRole.NoPermissions, "No Permissions");
}

/**
 * Injects an emoji into the first markdown heading if the emoji is valid sequence of one or more emoji characters.
 *
 * @param markdown The markdown content.
 * @param icon The icon string to inject (if it's a valid emoji).
 * @returns The updated markdown with the emoji injected into the heading.
 */
export function injectEmojiIntoHeading(markdown: string, icon?: Image.ImageLike): string {
  if (typeof icon !== "string") return markdown;
  const trimmedIcon = icon.trim();
  if (!isEmoji(trimmedIcon)) return markdown;
  return markdown.replace(/^(#+) (.*)/, (_, hashes, heading) => `${hashes} ${trimmedIcon} ${heading}`);
}

/**
 * Checks if a string is a valid emoji.
 *
 * @param s The string to check.
 * @returns True if the string is a valid emoji, false otherwise.
 */
export function isEmoji(s: string) {
  const match = emojiRegex().exec(s);
  return match !== null && match[0] === s;
}
