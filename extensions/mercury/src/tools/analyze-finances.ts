import { loadEachLogin } from "../logins";
import { Account, getAccounts, getAllPages, log, Transaction } from "../mercury";

type Input = {
  /**
   * The time period to analyze: "month", "quarter", or "year"
   */
  period?: "month" | "quarter" | "year";
};

/**
 * Analyzes financial data from Mercury accounts and provides insights.
 * Calculates metrics like cash flow, top expenses, and income sources for the specified period.
 */
export default async function (input: Input = {}) {
  const { period = "month" } = input;

  try {
    // Calculate date range based on period
    const startDate = new Date();

    switch (period) {
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Fetch accounts and every transaction in the period, for each connected Mercury account.
    // An organization that can't be reached is reported in `unavailable` rather than failing the rest.
    const { results, unavailable } = await loadEachLogin(async (login) => {
      const [accounts, transactions] = await Promise.all([
        getAccounts(login.token),
        getAllPages<Transaction>(
          login.token,
          `/transactions?limit=1000&start=${startDate.toISOString().split("T")[0]}`,
          "transactions",
        ),
      ]);
      return { accounts, transactions };
    });
    const accounts: Account[] = results.flatMap(({ value }) => value.accounts);
    const allTransactions: Transaction[] = results.flatMap(({ value }) => value.transactions);

    // Calculate financial metrics
    const totalBalance = accounts.reduce((sum, account) => sum + account.currentBalance, 0);
    const totalAvailableBalance = accounts.reduce((sum, account) => sum + account.availableBalance, 0);

    const inflows = allTransactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
    const outflows = allTransactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0);
    const netCashFlow = inflows + outflows;

    // Group transactions by category
    const transactionsByType = allTransactions.reduce(
      (acc, tx) => {
        const type = tx.kind;
        if (!acc[type]) {
          acc[type] = { count: 0, total: 0 };
        }
        acc[type].count += 1;
        acc[type].total += tx.amount;
        return acc;
      },
      {} as Record<string, { count: number; total: number }>,
    );

    // Find top expenses and income sources
    const counterparties = allTransactions.reduce(
      (acc, tx) => {
        const name = tx.counterpartyName || "Unknown";
        if (!acc[name]) {
          acc[name] = { count: 0, total: 0 };
        }
        acc[name].count += 1;
        acc[name].total += tx.amount;
        return acc;
      },
      {} as Record<string, { count: number; total: number }>,
    );

    const topExpenses = Object.entries(counterparties)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, data]) => data.total < 0)
      .sort((a, b) => a[1].total - b[1].total)
      .slice(0, 5)
      .map(([name, data]) => ({ name, amount: data.total, count: data.count }));

    const topIncome = Object.entries(counterparties)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, data]) => data.total > 0)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, data]) => ({ name, amount: data.total, count: data.count }));

    const largestTransactions = [...allTransactions]
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 5)
      .map(({ counterpartyName, amount, createdAt, kind, status, accountId }) => ({
        counterpartyName,
        amount,
        date: createdAt.split("T")[0],
        kind,
        status,
        account: accounts.find((account) => account.id === accountId)?.name ?? accountId,
      }));

    return {
      period,
      accounts: {
        count: accounts.length,
        totalBalance,
        totalAvailableBalance,
      },
      cashFlow: {
        inflows,
        outflows,
        netCashFlow,
      },
      transactionsByType,
      topExpenses,
      topIncome,
      largestTransactions,
      unavailable,
    };
  } catch (error) {
    log.error("Error analyzing finances:", error);
    throw new Error(`Error analyzing finances: ${error instanceof Error ? error.message : String(error)}`);
  }
}
