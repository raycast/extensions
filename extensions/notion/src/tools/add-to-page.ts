import { appendToPage } from "../utils/notion";
import { resolveAccountIdForTool } from "../utils/notion/oauth";

type Input = {
  /** The ID of the page to append the content to. */
  pageId: string;
  /** The content in markdown format to append to the page. */
  content: string;
  /** Optional account label (for example: Work or Personal) */
  accountLabel?: string;
};

export default async function addToPage({ pageId, content, accountLabel }: Input) {
  const accountId = resolveAccountIdForTool(accountLabel);
  const result = await appendToPage(pageId, { content }, accountId);
  return result;
}

export function confirmation(params: Input) {
  return {
    message: "Are you sure you want to add the content to the page?",
    info: [{ name: "content", value: params.content }],
  };
}
