// Pure helpers for AI Chat page mentions. Keep runtime imports out of this file so tests can load it directly.
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { formatDistanceStrict } from "date-fns";

import type { Page } from "./notion";

export const MAX_MENTIONS = 50;
const URI_PREFIX = "notion://pages/";
const NOTION_ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
/** Large pages are cut so a single mention cannot fill the model's context. */
export const MAX_CONTENT_LENGTH = 50_000;

export type MentionPage = Pick<
  Page,
  "object" | "id" | "title" | "icon_emoji" | "icon_file" | "icon_external" | "last_edited_time"
>;

export type PageMention = { title: string; uri: string; description: string; icon: string };

function normalizeId(id: string) {
  const hex = id.replace(/-/g, "").toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function toPageMentionUri(pageId: string) {
  return `${URI_PREFIX}${normalizeId(pageId)}`;
}

export function parsePageMentionUri(uri: string) {
  const id = uri.startsWith(URI_PREFIX) ? uri.slice(URI_PREFIX.length) : "";
  if (!NOTION_ID.test(id)) throw new Error("Invalid Notion page URI.");
  return normalizeId(id);
}

/**
 * The page's own icon when it has one. Emoji come first because uploaded icons are signed URLs that expire after an
 * hour.
 */
function getMentionIcon(page: MentionPage, fallbackIcon: string) {
  return page.icon_emoji || page.icon_external || page.icon_file || fallbackIcon;
}

export function toPageMentions(pages: readonly MentionPage[], fallbackIcon: string, now = new Date()): PageMention[] {
  const seen = new Set<string>();
  const mentions: PageMention[] = [];

  for (const page of pages) {
    const uri = toPageMentionUri(page.id);
    if (page.object !== "page" || seen.has(uri)) continue;
    seen.add(uri);
    mentions.push({
      title: page.title?.trim() || "Untitled",
      uri,
      description: page.last_edited_time
        ? `Edited ${formatDistanceStrict(page.last_edited_time, now, { addSuffix: true })}`
        : "Page",
      icon: getMentionIcon(page, fallbackIcon),
    });
    if (mentions.length === MAX_MENTIONS) break;
  }

  return mentions;
}

type PageProperty = PageObjectResponse["properties"][string];

function plainText(richText: readonly { plain_text: string }[]) {
  return richText.map((text) => text.plain_text).join("");
}

function userName(user: object) {
  return "name" in user && typeof user.name === "string" ? user.name : undefined;
}

function dateRange(date: { start: string; end: string | null } | null) {
  return date ? [date.start, date.end].filter(Boolean).join(" → ") : undefined;
}

/** A readable value for each property that carries one without further requests. Relations and rollups are skipped. */
export function propertyToText(property: PageProperty): string | undefined {
  switch (property.type) {
    case "rich_text":
      return plainText(property.rich_text);
    case "number":
      return property.number === null ? undefined : String(property.number);
    case "select":
      return property.select?.name;
    case "status":
      return property.status?.name;
    case "multi_select":
      return property.multi_select.map((option) => option.name).join(", ");
    case "date":
      return dateRange(property.date);
    case "checkbox":
      return property.checkbox ? "Yes" : "No";
    case "url":
      return property.url ?? undefined;
    case "email":
      return property.email ?? undefined;
    case "phone_number":
      return property.phone_number ?? undefined;
    case "people":
      return property.people.flatMap((user) => userName(user) ?? []).join(", ");
    case "created_by":
      return userName(property.created_by);
    case "last_edited_by":
      return userName(property.last_edited_by);
    case "created_time":
      return property.created_time;
    case "last_edited_time":
      return property.last_edited_time;
    case "unique_id":
      return property.unique_id.number === null
        ? undefined
        : [property.unique_id.prefix, property.unique_id.number].filter((part) => part !== null).join("-");
    case "files":
      return property.files.map((file) => file.name).join(", ");
    case "formula": {
      const formula = property.formula;
      switch (formula.type) {
        case "string":
          return formula.string ?? undefined;
        case "number":
          return formula.number === null ? undefined : String(formula.number);
        case "boolean":
          return formula.boolean === null ? undefined : formula.boolean ? "Yes" : "No";
        case "date":
          return dateRange(formula.date);
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

export function getPageTitle(page: Pick<PageObjectResponse, "properties">) {
  for (const property of Object.values(page.properties)) {
    if (property.type === "title") return plainText(property.title).trim() || "Untitled";
  }
  return "Untitled";
}

/**
 * Renders a mentioned page as Markdown: its title, link, and properties, followed by its content as it is when the
 * message is sent.
 */
export function toPageResource(
  page: Pick<PageObjectResponse, "url" | "last_edited_time" | "properties">,
  content: string,
) {
  const details = [`- URL: ${page.url}`, `- Last edited: ${page.last_edited_time}`];
  for (const [name, property] of Object.entries(page.properties)) {
    if (property.type === "title") continue;
    const value = propertyToText(property)?.trim();
    if (value) details.push(`- ${name}: ${value.replace(/\s*\n\s*/g, " ")}`);
  }

  const body = content.trim();
  const text = !body
    ? "*Page is empty*"
    : body.length > MAX_CONTENT_LENGTH
      ? `${body.slice(0, MAX_CONTENT_LENGTH)}\n\n*Content truncated.*`
      : body;

  return { text: [`# ${getPageTitle(page)}`, details.join("\n"), text].join("\n\n"), mimeType: "text/markdown" };
}
