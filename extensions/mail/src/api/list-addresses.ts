import { executeSQL } from "@raycast/utils";
import { getDatabasePath } from "./get-persistence-info";

type Address = {
  address: string;
  name: string;
};

export async function listAddresses(query?: string) {
  const databasePath = await getDatabasePath();
  const MESSAGES_QUERY = `
SELECT 
address,
comment as name
FROM addresses
${query ? `WHERE address LIKE '%${query}%'` : ""};
`;

  return await executeSQL<Address>(databasePath, MESSAGES_QUERY);
}
