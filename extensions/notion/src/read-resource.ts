import { APIErrorCode, isFullPage, isNotionClientError } from "@notionhq/client";
import { withAccessToken } from "@raycast/utils";
import { NotionToMarkdown } from "notion-to-md";

import { getNotionClient, notionService } from "./utils/notion/oauth";
import { parsePageMentionUri, toPageResource } from "./utils/mentions";

type Input = {
  /** The URI of a page selected from the Pages mention search. */
  uri: string;
};

const unavailable = () => new Error("This Notion page is no longer available, or Raycast no longer has access to it.");

/** Reads the page when the message is sent, so edits made after it was mentioned are included. */
export default withAccessToken(notionService)(async ({ uri }: Input) => {
  const pageId = parsePageMentionUri(uri);
  const notion = getNotionClient();

  let page;
  try {
    page = await notion.pages.retrieve({ page_id: pageId });
  } catch (error) {
    if (isNotionClientError(error) && error.code === APIErrorCode.ObjectNotFound) throw unavailable();
    throw error;
  }
  if (!isFullPage(page) || page.in_trash || page.archived) throw unavailable();

  const n2m = new NotionToMarkdown({ notionClient: notion });
  const content = n2m.toMarkdownString(await n2m.pageToMarkdown(pageId)).parent ?? "";
  return toPageResource(page, content);
});
