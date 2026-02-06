import { getApiClient } from "../lib/accounts";
import { formatCurrency } from "../lib/utils";

type Input = {
  period?: "7d" | "30d" | "90d" | "365d";
};

export default async function AnalyzeFinances(input: Input) {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };

  try {
    const days =
      { "7d": 7, "30d": 30, "90d": 90, "365d": 365 }[input.period ?? "30d"] ??
      30;
    const start = new Date();
    start.setDate(start.getDate() - days);

    const [accounts, transactions] = await Promise.all([
      api.getAccounts(),
      api.getAllTransactions({
        start: start.toISOString().split("T")[0],
        limit: 500,
      }),
    ]);

    const activeAccounts = accounts.filter((a) => a.status === "active");
    const totalBalance = activeAccounts.reduce(
      (sum, a) => sum + a.availableBalance,
      0,
    );

    const income = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const topExpenses = new Map<string, number>();
    transactions
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        const name = t.counterpartyName || "Unknown";
        topExpenses.set(
          name,
          (topExpenses.get(name) ?? 0) + Math.abs(t.amount),
        );
      });

    const sortedExpenses = Array.from(topExpenses.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, amount]) => ({ name, amount: formatCurrency(amount) }));

    return {
      period: `Last ${days} days`,
      totalBalance: formatCurrency(totalBalance),
      accountCount: activeAccounts.length,
      accounts: activeAccounts.map((a) => ({
        name: a.nickname ?? a.name,
        balance: formatCurrency(a.availableBalance),
      })),
      transactionCount: transactions.length,
      totalIncome: formatCurrency(income),
      totalExpenses: formatCurrency(expenses),
      netCashflow: formatCurrency(income - expenses),
      topExpensesByCounterparty: sortedExpenses,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}