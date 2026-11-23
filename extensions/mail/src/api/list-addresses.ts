import { executeSQL } from "@raycast/utils";
import { getDatabasePath } from "./get-persistence-info";

type Address = {
  address: string;
  name: string;
};

// Matches `query` anywhere in the value: quotes are doubled for the SQL string, and `%`, `_` and the
// escape character itself are escaped so they match literally instead of acting as wildcards.
const toContainsPattern = (query: string) =>
  `'%${query.replace(/[\\%_]/g, "\\$&").replaceAll("'", "''")}%' ESCAPE '\\'`;

export async function listAddresses(query?: string) {
  const databasePath = await getDatabasePath();
  const MESSAGES_QUERY = `
SELECT 
address,
comment as name
FROM addresses
${query ? `WHERE address LIKE ${toContainsPattern(query)}` : ""};
`;

  return await executeSQL<Address>(databasePath, MESSAGES_QUERY);
}
