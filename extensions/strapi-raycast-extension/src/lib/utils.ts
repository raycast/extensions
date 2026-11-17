import { ContentKind, ContentType, Entry } from "../types";

const TITLE_KEYS = ["title", "name", "subject", "label", "key", "username", "email", "slug"];
const SUBTITLE_KEYS = [
  "description",
  "intro",
  "lead",
  "summary",
  "excerpt",
  "content",
  "message",
  "body",
  "text",
  "comment",
  "note",
];
const TEXT_TYPES = ["string", "text", "email", "uid"];

/**
 * Returns a human-readable name for the given kind.
 *
 * @param kind - The kind of type, either 'collectionType' or 'singleType'.
 * @returns 'Collection' if the kind is 'collectionType', otherwise 'Single'.
 */
export const kindName = (kind: ContentKind) => {
  return kind === "collectionType" ? "Collection" : "Single";
};

/**
 * Capitalize the first letter of every word in the given string.
 * @param string - The string to capitalize.
 * @returns The string with the first letter of every word capitalized.
 */
export const capitalize = (string: string) => {
  return string
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Returns a readable plural name for the given content-type, e.g. 'Blog Posts'.
 */
export const pluralTitle = (contentType: ContentType) => capitalize(contentType.schema.pluralName.replaceAll("-", " "));

/**
 * Returns the names of the attributes of the given types, ordered by the preferred keys first.
 */
const fieldsOfType = (contentType: ContentType, types: string[], preferredKeys: string[]) => {
  const fields = Object.entries(contentType.schema.attributes)
    .filter(([, attribute]) => types.includes(attribute.type) && !attribute.private)
    .map(([name]) => name);

  return [...preferredKeys.filter((key) => fields.includes(key)), ...fields.filter((f) => !preferredKeys.includes(f))];
};

/**
 * Returns the text fields that can be used for searching entries.
 */
export const searchableFields = (contentType: ContentType) => fieldsOfType(contentType, TEXT_TYPES, TITLE_KEYS);

/**
 * Converts a value to a single line of plain text, or undefined if it can't be displayed as text.
 * Supports strings, numbers, booleans and Strapi blocks.
 */
export const toText = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const text = value
      .replace(/<[^>]*>/g, "") // HTML tags
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // Markdown links & images
      .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "") // Markdown headings, quotes & lists
      .replace(/\*\*|__|~~|`/g, "") // Markdown emphasis & code
      .replace(/\s+/g, " ")
      .trim();
    return text || undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") return value.toString();

  // Strapi blocks: an array of nodes with nested `children` and `text` leaves
  if (Array.isArray(value)) {
    const collect = (node: unknown): string => {
      if (!node || typeof node !== "object") return "";
      const { text, children } = node as { text?: unknown; children?: unknown[] };
      return typeof text === "string" ? text : (children ?? []).map(collect).join(" ");
    };
    return toText(value.map(collect).join(" "));
  }

  return undefined;
};

/**
 * Retrieves a title for the given entry based on the text fields of its content-type.
 *
 * @param entry - The entry object to extract the title from.
 * @param contentType - The content-type of the entry.
 * @returns The title of the entry, falling back to its documentId or id.
 */
export const entryTitle = (entry: Entry, contentType: ContentType) => {
  const title = searchableFields(contentType)
    .map((field) => toText(entry[field]))
    .find(Boolean);

  return title ?? entry.documentId ?? entry.id.toString();
};

/**
 * Retrieves a subtitle for the given entry based on common long text fields.
 *
 * @param entry - The entry object to extract the subtitle from.
 * @param contentType - The content-type of the entry.
 * @returns The subtitle of the entry or an empty string if none found.
 */
export const entrySubtitle = (entry: Entry, contentType: ContentType) => {
  const subtitle = SUBTITLE_KEYS.filter((key) => key in contentType.schema.attributes)
    .map((key) => toText(entry[key]))
    .find(Boolean);

  return subtitle && subtitle.length > 120 ? `${subtitle.slice(0, 120)}…` : (subtitle ?? "");
};

/**
 * Formats a file size in kilobytes, as returned by Strapi, to a readable size.
 */
export const formatSize = (kilobytes: number) => {
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
};
