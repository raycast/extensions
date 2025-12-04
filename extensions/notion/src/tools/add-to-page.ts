import { withAccessToken } from "@raycast/utils";

import { appendToPage } from "../utils/notion";
import { notionService } from "../utils/notion/oauth";

type Input = {
  /** The ID of the page to append the content to. */
  pageId: string;
  /** The content in markdown format to append to the page. */
  content: string;
};

export default withAccessToken(notionService)(async ({ pageId, content }: Input) => {
  const result = await appendToPage(pageId, { content });
  return result;
});

export function confirmation(params: Input) {
  return {
    message: "Are you sure you want to add the content to the page?",
    info: [{ name: "content", value: params.content }],
  };
}
