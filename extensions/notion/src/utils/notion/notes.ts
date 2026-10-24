import { APIErrorCode, ClientErrorCode, isNotionClientError } from "@notionhq/client";
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import { LocalStorage } from "@raycast/api";
import { format } from "date-fns";

import { getNotionClient } from "./oauth";

export type NoteStyle = "bulleted" | "todo" | "paragraph";

const ROOT_PAGE_CACHE_KEY = "NOTES_ROOT_PAGE";
const DATE_PAGE_CACHE_KEY = "NOTES_DATE_PAGE";

function rootCacheKey(rootName: string) {
  return `${ROOT_PAGE_CACHE_KEY}::${rootName.toLowerCase()}`;
}

function datePageCacheKey(rootId: string, dateTitle: string) {
  return `${DATE_PAGE_CACHE_KEY}::${rootId}::${dateTitle}`;
}

export function getDateTitle(dateFormat: string, date: Date = new Date()) {
  try {
    return format(date, dateFormat);
  } catch {
    return format(date, "yyyy-MM-dd");
  }
}

/** Returns the page id if it still exists and isn't in the trash. */
async function validatePageId(pageId: string) {
  try {
    const notion = getNotionClient();
    const page = await notion.pages.retrieve({ page_id: pageId });
    const isTrashed = ("archived" in page && page.archived) || ("in_trash" in page && page.in_trash);
    return isTrashed ? undefined : pageId;
  } catch {
    return undefined;
  }
}

async function getCachedPageId(key: string) {
  const cached = await LocalStorage.getItem<string>(key);
  if (!cached) return undefined;

  const pageId = await validatePageId(cached);
  if (!pageId) await LocalStorage.removeItem(key);

  return pageId;
}

async function searchPageByTitle(title: string) {
  const notion = getNotionClient();
  let cursor: string | undefined;

  // Paginate: a workspace can return the matching page well past the first batch,
  // and missing it would create a duplicate notes root.
  do {
    const { results, has_more, next_cursor } = await notion.search({
      query: title,
      filter: { property: "object", value: "page" },
      start_cursor: cursor,
      page_size: 100,
    });

    const match = results.find((result) => {
      if (result.object !== "page" || !("properties" in result)) return false;
      // Pages living in a database aren't valid parents for sub-pages we want to reuse
      if (result.parent.type === "database_id" || result.parent.type === "data_source_id") return false;

      const titleProperty = Object.values(result.properties).find((property) => property.type === "title");
      if (!titleProperty || titleProperty.type !== "title") return false;

      const pageTitle = titleProperty.title.map((text) => text.plain_text).join("");
      return pageTitle.trim().toLowerCase() === title.trim().toLowerCase();
    });

    if (match) return match.id;

    cursor = has_more && next_cursor ? next_cursor : undefined;
  } while (cursor);

  return undefined;
}

async function findChildPageByTitle(parentPageId: string, title: string) {
  const notion = getNotionClient();
  let cursor: string | undefined;

  do {
    const { results, has_more, next_cursor } = await notion.blocks.children.list({
      block_id: parentPageId,
      start_cursor: cursor,
      page_size: 100,
    });

    const match = results.find(
      (block) =>
        "type" in block &&
        block.type === "child_page" &&
        block.child_page.title.trim().toLowerCase() === title.trim().toLowerCase(),
    );

    if (match) return match.id;

    cursor = has_more && next_cursor ? next_cursor : undefined;
  } while (cursor);

  return undefined;
}

async function createSubPage(parentPageId: string, title: string, icon?: string) {
  const notion = getNotionClient();
  const page = await notion.pages.create({
    parent: { page_id: parentPageId },
    icon: icon ? { type: "emoji", emoji: icon as "📝" } : undefined,
    properties: {
      title: { title: [{ text: { content: title } }] },
    },
  });

  return page.id;
}

export class MissingNotesRootError extends Error {
  constructor(readonly rootName: string) {
    super(`There is no "${rootName}" page yet`);
    this.name = "MissingNotesRootError";
  }
}

/**
 * Finds the root notes page by title, creating it under `parentPageId` when it doesn't exist.
 * Notion's API can't create workspace-level pages, hence the parent requirement.
 */
export async function getOrCreateNotesRoot(rootName: string, parentPageId?: string) {
  const cacheKey = rootCacheKey(rootName);

  const cachedId = await getCachedPageId(cacheKey);
  if (cachedId) return cachedId;

  let rootId = parentPageId ? await findChildPageByTitle(parentPageId, rootName) : undefined;
  rootId ??= await searchPageByTitle(rootName);

  if (!rootId) {
    if (!parentPageId) throw new MissingNotesRootError(rootName);
    rootId = await createSubPage(parentPageId, rootName, "🗒️");
  }

  await LocalStorage.setItem(cacheKey, rootId);
  return rootId;
}

/** Finds today's page inside the root notes page, creating it when missing. */
export async function getOrCreateDatePage(rootPageId: string, dateTitle: string) {
  const cacheKey = datePageCacheKey(rootPageId, dateTitle);

  const cachedId = await getCachedPageId(cacheKey);
  if (cachedId) return cachedId;

  const datePageId =
    (await findChildPageByTitle(rootPageId, dateTitle)) ?? (await createSubPage(rootPageId, dateTitle));

  await LocalStorage.setItem(cacheKey, datePageId);
  return datePageId;
}

/** Notion rejects any rich text element longer than this, so long notes are split across elements. */
const RICH_TEXT_LIMIT = 2000;

function toRichText(note: string) {
  const chunks: string[] = [];

  for (let index = 0; index < note.length; index += RICH_TEXT_LIMIT) {
    chunks.push(note.slice(index, index + RICH_TEXT_LIMIT));
  }

  return chunks.map((content) => ({ type: "text" as const, text: { content } }));
}

function buildNoteBlock(note: string, style: NoteStyle): BlockObjectRequest {
  const rich_text = toRichText(note);

  switch (style) {
    case "todo":
      return { to_do: { rich_text, checked: false } };
    case "paragraph":
      return { paragraph: { rich_text } };
    default:
      return { bulleted_list_item: { rich_text } };
  }
}

type AddNoteParams = {
  note: string;
  rootName: string;
  dateFormat: string;
  style: NoteStyle;
  parentPageId?: string;
};

/**
 * Appends a note to today's page inside the root notes page, creating both pages when needed.
 * Returns the date page so the caller can link to it.
 */
export async function addNote({ note, rootName, dateFormat, style, parentPageId }: AddNoteParams) {
  const notion = getNotionClient();

  const rootPageId = await getOrCreateNotesRoot(rootName, parentPageId);
  const dateTitle = getDateTitle(dateFormat);
  const datePageId = await getOrCreateDatePage(rootPageId, dateTitle);

  await notion.blocks.children.append({
    block_id: datePageId,
    children: [buildNoteBlock(note, style)],
  });

  return { rootPageId, datePageId, dateTitle };
}

export type AddNoteErrorInfo = {
  title: string;
  message: string;
  /** Form field the error should be attached to, so it stays visible after the toast fades. */
  field?: "parentPage";
};

/**
 * Turns any failure into wording the user can act on.
 * Raw Notion API messages are logged instead of shown: they mention internal ids and block types.
 */
export function describeAddNoteError(err: unknown, rootName: string): AddNoteErrorInfo {
  console.error(err);

  if (err instanceof MissingNotesRootError) {
    return {
      title: `No "${rootName}" page found`,
      message: `Choose the page it should be created in — Notion doesn't let Raycast create top-level pages.`,
      field: "parentPage",
    };
  }

  if (isNotionClientError(err)) {
    switch (err.code) {
      case APIErrorCode.Unauthorized:
      case ClientErrorCode.RequestTimeout:
        return {
          title: "Couldn't reach Notion",
          message: "Check your connection, then run the command again.",
        };
      case APIErrorCode.RestrictedResource:
      case APIErrorCode.ObjectNotFound:
        return {
          title: "Raycast can't access that page",
          message: "In Notion, open the page menu and share it with the Raycast integration.",
          field: "parentPage",
        };
      case APIErrorCode.RateLimited:
        return {
          title: "Notion is rate limiting Raycast",
          message: "Wait a few seconds and try again.",
        };
    }
  }

  return {
    title: "Couldn't save the note",
    message: "Your note wasn't written to Notion. Try again — the text is still in the form.",
  };
}
