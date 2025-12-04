import { withAccessToken } from "@raycast/utils";

import { queryDatabase } from "../utils/notion/database";
import { notionService } from "../utils/notion/oauth";

type Input = {
  /** The ID of the database to search. */
  databaseId: string;
  /** The query to search for. Only use plain text: it doesn't support any operators */
  query: string;
};

export default withAccessToken(notionService)(async ({ databaseId, query }: Input) => {
  const result = await queryDatabase(databaseId, query);
  return result;
});
