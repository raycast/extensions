import { fetchBankTransactions, fetchBankAccounts } from "../services/freeagent";
import { formatCurrencyAmount, formatDate } from "../utils/formatting";
import { provider } from "../oauth";
import { BankTransaction } from "../types";

type Input = {
  /**
   * The type of analysis to perform on transactions
   */
  analysisType?: "recent" | "unexplained" | "large" | "patterns" | "monthly";
  /**
   * Number of days to look back (default: 30)
   */
  days?: number;
  /**
   * Minimum amount to consider for analysis
   */
  minAmount?: number;
};

/**
 * Analyze and categorize bank transactions to help understand spending patterns and identify unexplained transactions
 */
export default async function tool(input: Input = {}) {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    // Get bank accounts first
    const bankAccounts = await fetchBankAccounts(token);

    if (bankAccounts.length === 0) {
      return "📊 No bank accounts found in your FreeAgent account.";
    }

    const daysBack = input.days || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const fromDateStr = cutoffDate.toISOString().split("T")[0];

    let allTransactions: BankTransaction[] = [];

    // Fetch transactions from all accounts, filtering server-side by date.
    for (const account of bankAccounts) {
      try {
        const transactions = await fetchBankTransactions(token, account.url, undefined, fromDateStr);
        allTransactions = allTransactions.concat(transactions.map((t) => ({ ...t, account_name: account.name })));
      } catch (error) {
        console.warn(`Failed to fetch transactions for ${account.name}:`, error);
      }
    }

    if (allTransactions.length === 0) {
      return "📊 No bank transactions found across your accounts.";
    }

    const recentTransactions = allTransactions;

    let analysis = `💳 **Bank Transaction Analysis**\n\n`;

    if (input.analysisType === "recent" || !input.analysisType) {
      analysis += `📅 **Recent Activity (Last ${daysBack} days)**\n`;
      analysis += `• Total transactions: ${recentTransactions.length}\n`;

      const totalIncoming = recentTransactions
        .filter((t) => parseFloat(t.amount) > 0)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const totalOutgoing = Math.abs(
        recentTransactions.filter((t) => parseFloat(t.amount) < 0).reduce((sum, t) => sum + parseFloat(t.amount), 0),
      );

      const currency = bankAccounts[0]?.currency || "GBP";
      analysis += `• Money in: ${formatCurrencyAmount(currency, totalIncoming)}\n`;
      analysis += `• Money out: ${formatCurrencyAmount(currency, totalOutgoing)}\n`;
      analysis += `• Net change: ${formatCurrencyAmount(currency, totalIncoming - totalOutgoing)}\n\n`;
    }

    // Unexplained transactions
    const unexplainedTransactions = recentTransactions.filter(
      (transaction) => transaction.unexplained_amount && parseFloat(transaction.unexplained_amount) !== 0,
    );

    if (unexplainedTransactions.length > 0 && (input.analysisType === "unexplained" || !input.analysisType)) {
      analysis += `⚠️ **Unexplained Transactions (${unexplainedTransactions.length})**\n`;
      unexplainedTransactions.slice(0, 8).forEach((transaction) => {
        const amount = parseFloat(transaction.amount);
        const amountStr = formatCurrencyAmount(bankAccounts[0]?.currency || "GBP", Math.abs(amount));
        const direction = amount > 0 ? "💰 Income" : "💸 Expense";

        analysis += `• ${direction}: ${amountStr} - ${transaction.description} (${formatDate(transaction.dated_on)})\n`;
      });

      if (unexplainedTransactions.length > 8) {
        analysis += `... and ${unexplainedTransactions.length - 8} more unexplained transactions\n`;
      }
      analysis += `\n`;
    }

    // Large transactions
    const minAmount = input.minAmount || 1000;
    const largeTransactions = recentTransactions
      .filter((transaction) => Math.abs(parseFloat(transaction.amount)) >= minAmount)
      .sort((a, b) => Math.abs(parseFloat(b.amount)) - Math.abs(parseFloat(a.amount)));

    if (largeTransactions.length > 0 && (input.analysisType === "large" || !input.analysisType)) {
      analysis += `💎 **Large Transactions (≥${formatCurrencyAmount(bankAccounts[0]?.currency || "GBP", minAmount)})**\n`;
      largeTransactions.slice(0, 5).forEach((transaction) => {
        const amount = parseFloat(transaction.amount);
        const amountStr = formatCurrencyAmount(bankAccounts[0]?.currency || "GBP", Math.abs(amount));
        const direction = amount > 0 ? "💰" : "💸";

        analysis += `• ${direction} ${amountStr} - ${transaction.description} (${formatDate(transaction.dated_on)})\n`;
      });

      if (largeTransactions.length > 5) {
        analysis += `... and ${largeTransactions.length - 5} more large transactions\n`;
      }
      analysis += `\n`;
    }

    // Transaction patterns and categories
    if (input.analysisType === "patterns" || !input.analysisType) {
      analysis += `📊 **Spending Patterns**\n`;

      // Categorize transactions by common patterns
      const categories = {
        "Subscription/SaaS": recentTransactions.filter((t) =>
          /subscription|saas|monthly|yearly|adobe|microsoft|google|dropbox|spotify|netflix/i.test(t.description),
        ),
        "Office/Supplies": recentTransactions.filter((t) =>
          /office|supplies|amazon|stationery|equipment/i.test(t.description),
        ),
        "Travel/Transport": recentTransactions.filter((t) =>
          /travel|train|flight|hotel|taxi|uber|transport|fuel|petrol/i.test(t.description),
        ),
        "Marketing/Advertising": recentTransactions.filter((t) =>
          /marketing|advertising|facebook|google ads|linkedin|instagram/i.test(t.description),
        ),
        Utilities: recentTransactions.filter((t) =>
          /electric|gas|water|internet|phone|utilities|broadband/i.test(t.description),
        ),
        "Banking/Fees": recentTransactions.filter((t) => /fee|charge|bank|interest|commission/i.test(t.description)),
      };

      Object.entries(categories).forEach(([category, transactions]) => {
        if (transactions.length > 0) {
          const total = transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
          analysis += `• ${category}: ${transactions.length} transactions, ${formatCurrencyAmount(bankAccounts[0]?.currency || "GBP", total)}\n`;
        }
      });
      analysis += `\n`;
    }

    // Monthly breakdown
    if (input.analysisType === "monthly" || !input.analysisType) {
      const monthlyData: { [key: string]: { incoming: number; outgoing: number; count: number } } = {};

      recentTransactions.forEach((transaction) => {
        const date = new Date(transaction.dated_on);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { incoming: 0, outgoing: 0, count: 0 };
        }

        const amount = parseFloat(transaction.amount);
        if (amount > 0) {
          monthlyData[monthKey].incoming += amount;
        } else {
          monthlyData[monthKey].outgoing += Math.abs(amount);
        }
        monthlyData[monthKey].count++;
      });

      if (Object.keys(monthlyData).length > 0) {
        analysis += `📅 **Monthly Breakdown**\n`;
        Object.entries(monthlyData)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, 3)
          .forEach(([month, data]) => {
            const [year, monthNum] = month.split("-");
            const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            });
            const net = data.incoming - data.outgoing;

            analysis += `• ${monthName}: ${data.count} transactions, Net ${formatCurrencyAmount(bankAccounts[0]?.currency || "GBP", net)}\n`;
            analysis += `  - In: ${formatCurrencyAmount(bankAccounts[0]?.currency || "GBP", data.incoming)}, Out: ${formatCurrencyAmount(bankAccounts[0]?.currency || "GBP", data.outgoing)}\n`;
          });
      }
    }

    // Recommendations
    analysis += `\n💡 **Recommendations**\n`;

    if (unexplainedTransactions.length > 0) {
      analysis += `• Review and categorize ${unexplainedTransactions.length} unexplained transactions\n`;
    }

    if (largeTransactions.length > 0) {
      analysis += `• Verify ${largeTransactions.length} large transactions for accuracy\n`;
    }

    const manualTransactions = recentTransactions.filter((t) => t.is_manual);
    if (manualTransactions.length > 0) {
      analysis += `• ${manualTransactions.length} manual transactions may need reconciliation\n`;
    }

    return analysis;
  } catch (error) {
    console.error("Transaction analysis error:", error);
    return `❌ Unable to analyze transactions. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
