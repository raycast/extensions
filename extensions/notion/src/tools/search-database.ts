import { queryDatabase } from "../utils/notion/database";
import { resolveAccountIdForTool } from "../utils/notion/oauth";

type Input = {
  /** The ID of the database to search. */
  databaseId: string;
  /** The query to search for. Only use plain text: it doesn't support any operators */
  query: string;
  /** Optional account label (for example: Work or Personal) */
  accountLabel?: string;
};

export default async function searchDatabase({ databaseId, query, accountLabel }: Input) {
  const accountId = resolveAccountIdForTool(accountLabel);
  const result = await queryDatabase(databaseId, query, "last_edited_time", accountId);
  return result;
}
