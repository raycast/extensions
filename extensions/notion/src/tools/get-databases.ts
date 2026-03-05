import { fetchDatabases } from "../utils/notion/database";
import { resolveAccountIdForTool } from "../utils/notion/oauth";

type Input = {
  /** Optional account label (for example: Work or Personal) */
  accountLabel?: string;
};

export default async function getDatabases({ accountLabel }: Input = {}) {
  const accountId = resolveAccountIdForTool(accountLabel);
  const databases = await fetchDatabases(accountId);
  return databases;
}
