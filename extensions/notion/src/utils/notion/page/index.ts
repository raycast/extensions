import { BlockObjectRequest, UpdatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { showToast, Toast, Image, Icon } from "@raycast/api";
import { markdownToBlocks } from "@tryfabric/martian";
import { NotionToMarkdown } from "notion-to-md";

import { isMarkdownPageContent, PageContent } from "..";
import { getDateMention } from "../block";
import { handleError, pageMapper } from "../global";
import { getNotionClient } from "../oauth";

import { PageProperty } from "./property";

export * from "./property";

export async function fetchPage(pageId: string, silent: boolean = true) {
  try {
    const notion = getNotionClient();
    const page = await notion.pages.retrieve({
      page_id: pageId,
    });

    return pageMapper(page);
  } catch (err) {
    if (!silent) return handleError(err, "Failed to fetch page", undefined);
  }
}

export async function deletePage(pageId: string) {
  try {
    const notion = getNotionClient();

    await showToast({
      style: Toast.Style.Animated,
      title: "Deleting page",
    });

    await notion.pages.update({
      page_id: pageId,
      archived: true,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Page deleted",
    });
  } catch (err) {
    return handleError(err, "Failed to delete page", undefined);
  }
}

export async function patchPage(pageId: string, properties: UpdatePageParameters["properties"]) {
  try {
    const notion = getNotionClient();
    const page = await notion.pages.update({
      page_id: pageId,
      properties,
    });

    return pageMapper(page);
  } catch (err) {
    return handleError(err, "Failed to update page", undefined);
  }
}

export async function search(query?: string, nextCursor?: string, pageSize: number = 25) {
  const notion = getNotionClient();
  const database = await notion.search({
    sort: {
      direction: "descending",
      timestamp: "last_edited_time",
    },
    page_size: pageSize,
    query,
    ...(nextCursor && { start_cursor: nextCursor }),
  });

  return { pages: database.results.map(pageMapper), hasMore: database.has_more, nextCursor: database.next_cursor };
}

export async function fetchPageContent(pageId: string) {
  try {
    const notion = getNotionClient();
    const { results } = await notion.blocks.children.list({
      block_id: pageId,
    });

    const n2m = new NotionToMarkdown({ notionClient: notion });

    return {
      markdown:
        results.length === 0 ? "*Page is empty*" : n2m.toMarkdownString(await n2m.blocksToMarkdown(results)).parent,
    };
  } catch (err) {
    return handleError(err, "Failed to fetch page content", undefined);
  }
}

export async function fetchPageFirstBlockId(pageId: string) {
  try {
    const notion = getNotionClient();
    const { results } = await notion.blocks.children.list({
      block_id: pageId,
    });
    return results[0].id;
  } catch (err) {
    return handleError(err, "Failed to fetch page's first block", undefined);
  }
}

type AppendBlockToPageParams = {
  pageId: string;
  children: BlockObjectRequest[];
  prepend?: boolean;
  addDateDivider?: boolean;
};

export async function appendBlockToPage({
  pageId,
  children,
  prepend = false,
  addDateDivider = false,
}: AppendBlockToPageParams) {
  try {
    const notion = getNotionClient();

    const childrenToInsert = addDateDivider ? [{ divider: {} }, getDateMention(), ...children] : children;
    const insertAfter = prepend ? await fetchPageFirstBlockId(pageId) : undefined;

    const { results } = await notion.blocks.children.append({
      block_id: pageId,
      children: childrenToInsert,
      after: insertAfter,
    });

    return results;
  } catch (err) {
    return handleError(err, "Failed to add block to the page", undefined);
  }
}

export async function appendToPage(pageId: string, params: { content: PageContent }) {
  try {
    const notion = getNotionClient();
    const { content } = params;

    const { results } = await notion.blocks.children.append({
      block_id: pageId,
      children: isMarkdownPageContent(content)
        ? // casting because converting from the `Block` type in martian to the `BlockObjectRequest` type in notion
          (markdownToBlocks(content) as BlockObjectRequest[])
        : content,
    });

    const n2m = new NotionToMarkdown({ notionClient: notion });

    return {
      markdown: results.length === 0 ? "" : "\n\n" + n2m.toMarkdownString(await n2m.blocksToMarkdown(results)),
    };
  } catch (err) {
    return handleError(err, "Failed to add content to the page", { markdown: "" });
  }
}

export function getPageIcon(page: Page): Image.ImageLike {
  return page.icon_emoji
    ? page.icon_emoji
    : page.icon_file
      ? page.icon_file
      : page.icon_external
        ? page.icon_external
        : page.object === "database"
          ? Icon.List
          : Icon.BlankDocument;
}

export function getPageName(page: Page): string {
  return (page.icon_emoji ? page.icon_emoji + " " : "") + (page.title ? page.title : "Untitled");
}
export interface Page {
  object: "page" | "database";
  id: string;
  parent_page_id?: string;
  parent_database_id?: string;
  created_by?: string;
  last_edited_time?: number;
  last_edited_user?: string;
  title: string | null;
  icon_emoji: string | null;
  icon_file: string | null;
  icon_external: string | null;
  url?: string;
  properties: Record<string, PageProperty>;
}
