import { getApiClient } from "../lib/accounts";
import { formatCurrency } from "../lib/utils";

export default async function GetTreasury() {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };
  try {
    const treasury = await api.getTreasury();
    return {
      accounts: treasury.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        availableBalance: a.availableBalance,
        formattedBalance: formatCurrency(a.availableBalance),
        status: a.status,
        createdAt: a.createdAt,
      })),
      totalBalance: formatCurrency(
        treasury.accounts.reduce((sum, a) => sum + a.availableBalance, 0),
      ),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}