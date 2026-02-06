import { getApiClient } from "../lib/accounts";

type Input = {
  accountId: string;
};

export default async function GetAccountBalance(input: Input) {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };
  try {
    const account = await api.getAccount(input.accountId);
    return {
      id: account.id,
      name: account.nickname ?? account.name,
      availableBalance: account.availableBalance,
      currentBalance: account.currentBalance,
      status: account.status,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}