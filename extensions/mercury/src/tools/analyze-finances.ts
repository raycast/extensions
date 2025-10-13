import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Account {
  id: string;
  name: string;
  nickname: string | null;
  currentBalance: number;
  availableBalance: number;
  kind: string;
  status: string;
  createdAt: string;
  legalBusinessName: string;
}

interface Transaction {
  id: string;
  amount: number;
  counterpartyName: string;
  createdAt: string;
  status: string;
  kind: string;
}

type Input = {
  /**
   * The time period to analyze: "month", "quarter", or "year"
   */
  period?: "month" | "quarter" | "year";
};

const API_BASE_URL = "https://api.mercury.com/api/v1/";

/**
 * Analyzes financial data from Mercury accounts and provides insights.
 * Calculates metrics like cash flow, top expenses, and income sources for the specified period.
 */
export default async function (input: Input = {}) {
  const { apiKey } = getPreferenceValues<Preferences>();
  const { period = "month" } = input;

  try {
    // Fetch accounts
    const accountsResponse = await fetch(`${API_BASE_URL}/accounts`, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!accountsResponse.ok) {
      throw new Error(`Failed to fetch accounts: ${accountsResponse.statusText}`);
    }

    const accountsData = (await accountsResponse.json()) as {
      accounts: Account[];
    };
    const accounts = accountsData.accounts;

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

    // Fetch transactions for each account within date range
    const allTransactions: Transaction[] = [];
    for (const account of accounts) {
      const txResponse = await fetch(
        `${API_BASE_URL}/account/${account.id}/transactions?limit=500&start=${startDate.toISOString().split("T")[0]}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      if (txResponse.ok) {
        const txData = (await txResponse.json()) as {
          transactions: Transaction[];
        };
        allTransactions.push(...txData.transactions);
      } else {
        throw new Error(`Failed to fetch transactions for account ${account.id}: ${txResponse.statusText}`);
      }
    }

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
    };
  } catch (error) {
    console.error("Error analyzing finances:", error);
    throw new Error(`Error analyzing finances: ${error instanceof Error ? error.message : String(error)}`);
  }
}
