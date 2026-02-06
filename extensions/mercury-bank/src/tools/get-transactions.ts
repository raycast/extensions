import { getApiClient } from "../lib/accounts";
import { formatCurrency } from "../lib/utils";

type Input = {
  search?: string;
  status?: string;
  limit?: number;
  start?: string;
  end?: string;
};

export default async function GetTransactions(input: Input) {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };
  try {
    const transactions = await api.getAllTransactions({
      search: input.search,
      status: input.status,
      limit: input.limit ?? 25,
      start: input.start,
      end: input.end,
    });
    return transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      formattedAmount: formatCurrency(t.amount),
      counterpartyName: t.counterpartyName,
      status: t.status,
      kind: t.kind,
      createdAt: t.createdAt,
      note: t.note,
      category: t.mercuryCategory,
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}