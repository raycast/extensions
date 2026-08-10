import { withAccessToken } from "@raycast/utils";

import { fetchDatabases } from "../utils/notion/database";
import { notionService } from "../utils/notion/oauth";

export default withAccessToken(notionService)(async () => {
  const databases = await fetchDatabases();
  return databases;
});
