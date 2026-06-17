import { withAccessToken } from "@raycast/utils";

import { getNotionClient, notionService } from "../utils/notion/oauth";

type Input = {
  /** The ID of the Notion page to fetch */
  pageId: string;
};

export default withAccessToken(notionService)(async ({ pageId }: Input) => {
  try {
    const notion = getNotionClient();
    const { results } = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
    });

    if (results.length === 0) return { status: "empty", content: "Page is empty" };

    return {
      status: "success",
      content: JSON.stringify(results),
    };
  } catch (err) {
    return {
      status: "error",
      content: JSON.stringify(err),
    };
  }
});
