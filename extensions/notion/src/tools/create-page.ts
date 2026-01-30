import { createDatabasePage } from "../utils/notion";
import { getNotionClient, resolveAccountIdForTool } from "../utils/notion/oauth";

type Input = {
  /** The database id to create the page in. */
  databaseId: string;
  /** The title of the page to create. */
  title: string;
  /** Parses Markdown to Notion Blocks.

  It supports:
  - Headings (levels 4 to 6 are treated as 3 on Notion)
  - Numbered, bulleted, and to-do lists
  - Code blocks, block quotes, and tables
  - Text formatting; italics, bold, strikethrough, inline code, hyperlinks

  Please note that HTML tags and thematic breaks are not supported in Notion due to its limitations.*/
  content: string;
  /** Optional account label (for example: Work or Personal) */
  accountLabel?: string;
};

export default async function createPage({ databaseId, title, content, accountLabel }: Input) {
  const accountId = resolveAccountIdForTool(accountLabel);
  const result = await createDatabasePage(
    {
      database: databaseId,
      "property::title::title": title,
      content,
    },
    accountId,
  );
  return result;
}

export async function confirmation(params: Input) {
  const accountId = resolveAccountIdForTool(params.accountLabel);
  const notion = await getNotionClient(accountId);
  const database = await notion.databases.retrieve({ database_id: params.databaseId });

  let databaseName = params.databaseId;
  if ("title" in database) {
    databaseName = database.title[0].plain_text;
  }

  return {
    message: "Are you sure you want to create the page?",
    info: [
      { name: "Title", value: params.title },
      { name: "Content", value: params.content },
      { name: "In database", value: databaseName },
    ],
  };
}
