import { getApiClient } from "../lib/accounts";

export default async function GetAccounts() {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };
  try {
    const accounts = await api.getAccounts();
    return accounts.map((a) => ({
      id: a.id,
      name: a.nickname ?? a.name,
      kind: a.kind,
      status: a.status,
      availableBalance: a.availableBalance,
      currentBalance: a.currentBalance,
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}