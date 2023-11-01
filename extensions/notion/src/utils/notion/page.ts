import { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import { showToast, Toast, Image, Icon } from "@raycast/api";
import { markdownToBlocks } from "@tryfabric/martian";
import { NotionToMarkdown } from "notion-to-md";

import { UnwrapRecord } from "../types";

import { authorize, notion } from "./authorize";
import { handleError, pageMapper } from "./global";

import { NotionObject } from ".";

export async function fetchPage(pageId: string) {
  try {
    await authorize();
    const page = await notion.pages.retrieve({
      page_id: pageId,
    });

    return pageMapper(page);
  } catch (err) {
    return handleError(err, "Failed to fetch page", undefined);
  }
}

export async function deletePage(pageId: string) {
  try {
    await authorize();

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

export async function patchPage(pageId: string, properties: Parameters<typeof notion.pages.update>[0]["properties"]) {
  try {
    await authorize();
    const page = await notion.pages.update({
      page_id: pageId,
      properties,
    });

    return pageMapper(page);
  } catch (err) {
    return handleError(err, "Failed to update page", undefined);
  }
}

export async function search(query: string | undefined) {
  try {
    await authorize();
    const database = await notion.search({
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
      page_size: 20,
      query,
    });

    return database.results.map(pageMapper);
  } catch (err) {
    return handleError(err, "Failed to search pages", []);
  }
}

export async function fetchPageContent(pageId: string) {
  try {
    await authorize();
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

export async function appendBlockToPage(pageId: string, children: BlockObjectRequest[]) {
  try {
    await authorize();

    const { results } = await notion.blocks.children.append({
      block_id: pageId,
      children,
    });

    return results;
  } catch (err) {
    return handleError(err, "Failed to add content to the page", undefined);
  }
}

export async function appendToPage(pageId: string, params: { content: string }) {
  try {
    await authorize();

    const arg: Parameters<typeof notion.blocks.children.append>[0] = {
      block_id: pageId,
      children: markdownToBlocks(params.content) as BlockObjectRequest[],
    };

    const { results } = await notion.blocks.children.append(arg);

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
  properties: Record<string, PagePropertyType>;
}

export interface PageContent {
  markdown: string | undefined;
}

type NotionProperties<T, TObject> = T extends { object: TObject; properties: infer U } ? U : never;
export type PagePropertyType = UnwrapRecord<NotionProperties<NotionObject, "page">>;
