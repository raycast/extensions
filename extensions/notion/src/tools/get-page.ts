import { getNotionClient, resolveAccountIdForTool } from "../utils/notion/oauth";

type Input = {
  /** The ID of the Notion page to fetch */
  pageId: string;
  /** Optional account label (for example: Work or Personal) */
  accountLabel?: string;
};

export default async function getPage({ pageId, accountLabel }: Input) {
  try {
    const accountId = resolveAccountIdForTool(accountLabel);
    const notion = await getNotionClient(accountId);
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
}
