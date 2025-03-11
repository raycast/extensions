import { executeSQL } from "@raycast/utils";
import { getDbPath } from "../utils/constants";

type Address = {
  address: string;
  name: string;
};

export async function listAddresses(query?: string) {
  const dbPath = await getDbPath();
  const MESSAGES_QUERY = `
SELECT 
address,
comment as name
FROM addresses
${query ? `WHERE address LIKE '%${query}%'` : ""};
`;

  return await executeSQL<Address>(dbPath, MESSAGES_QUERY);
}
