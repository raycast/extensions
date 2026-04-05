import { listAccounts } from "../lib/api";

type Input = {
  /**
   * Filter by platform name (e.g., instagram, linkedin, x).
   */
  platform?: string;
};

export default async function tool(input: Input) {
  const response = await listAccounts(input.platform);
  return {
    accounts: response.data.map((account) => ({
      id: account.id,
      platform: account.platform,
      username: account.username,
      display_name: account.display_name,
      content_types: account.content_types,
      status: account.status,
    })),
  };
}
