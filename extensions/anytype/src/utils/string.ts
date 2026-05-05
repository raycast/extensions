import { getPreferenceValues, Image } from "@raycast/api";
import emojiRegex from "emoji-regex";
import { MemberRole, ObjectLayout, SortProperty } from "../models";

/**
 * Simple utility for pluralizing words.
 */
export function pluralize(
  count: number,
  noun: string,
  { suffix = "s", withNumber = false }: { suffix?: string; withNumber?: boolean } = {},
): string {
  let pluralizedNoun;
  const shouldUseIes = noun.endsWith("y") && !/[aeiou]y$/i.test(noun) && count !== 1;
  if (shouldUseIes) {
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
 * If no heading exists and a name is provided, creates a new heading with the emoji and name.
 * For backwards compatibility, if a heading exists but doesn't match the name, prepends a new heading with the emoji and name.
 *
 * @param markdown The markdown content.
 * @param icon The icon string to inject (if it's a valid emoji).
 * @param name The name to use when creating a new heading (if markdown has no heading or different heading).
 * @param layout The layout of the object (notes don't have markdown headings).
 * @returns The updated markdown with the emoji injected into the heading.
 */
export function injectEmojiIntoHeading(
  markdown: string,
  icon?: Image.ImageLike,
  name?: string,
  layout?: ObjectLayout,
): string {
  const isNote = layout === ObjectLayout.Note;
  const hasValidEmoji = typeof icon === "string" && isEmoji(icon.trim());
  const emoji = hasValidEmoji ? (icon as string).trim() : "";

  const headingMatch = markdown.match(/^#+\s+(.+)/);

  if (headingMatch) {
    const existingHeading = headingMatch[1].trim();
    // If heading matches the name (old version), inject emoji if available
    if (name && existingHeading === name) {
      return emoji ? markdown.replace(/^(#+)\s+(.+)/, `$1 ${emoji} $2`) : markdown;
    }
    // If no name provided, inject emoji into existing heading
    if (!name && emoji) {
      return markdown.replace(/^(#+)\s+(.+)/, `$1 ${emoji} $2`);
    }
    // Different heading, prepend name with emoji (if available) - but not for notes
    if (name && !isNote) {
      const heading = emoji ? `# ${emoji} ${name}` : `# ${name}`;
      return `${heading}\n${markdown}`;
    }
  }

  // No heading exists, create one with name (and emoji if available) - but not for notes
  if (name && !isNote) {
    const heading = emoji ? `# ${emoji} ${name}` : `# ${name}`;
    return `${heading}\n${markdown}`;
  }

  return markdown;
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

/**
 * Get the name with 'Untitled' as fallback.
 */
export function getNameWithFallback(name: string) {
  return name?.trim() || "Untitled";
}

/**
 * Get the name with snippet as first fallback and 'Untitled' as second.
 */
export function getNameWithSnippetFallback(name: string, snippet: string) {
  return name?.trim() || (snippet.includes("\n") ? `${snippet.split("\n")[0]}...` : snippet || "Untitled");
}
