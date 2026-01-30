import { search, Page } from "../utils/notion";
import { resolveAccountIdForTool } from "../utils/notion/oauth";

type cleanedPage = Pick<Page, "id" | "title" | "url" | "parent_database_id" | "parent_page_id">;

type Input = {
  /** The title of the page to search for. Only use plain text: it doesn't support any operators */
  searchText: string;
  /** Optional account label (for example: Work or Personal) */
  accountLabel?: string;
};

export default async function searchPages({ searchText, accountLabel }: Input) {
  const accountId = resolveAccountIdForTool(accountLabel);
  const allPages: cleanedPage[] = [];
  let hasNextPage = true;
  let cursor: string | undefined = undefined;
  const pageSize = 100;

  while (hasNextPage && allPages.length < 250) {
    const result = await search(searchText, cursor, pageSize, accountId);
    allPages.push(
      ...result.pages.map((page) => ({
        id: page.id,
        title: page.title,
        url: page.url,
        parent_database_id: page.parent_database_id,
        parent_page_id: page.parent_page_id,
      })),
    );
    hasNextPage = result.hasMore;
    cursor = result.nextCursor ?? undefined;
  }

  return allPages;
}
