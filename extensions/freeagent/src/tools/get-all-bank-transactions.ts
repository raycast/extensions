import { fetchBankTransactions, fetchBankAccounts } from "../services/freeagent";
import { provider } from "../oauth";

const MAX_TRANSACTIONS_TO_DISPLAY = 50;

type Input = {
  /**
   * Bank account URL to filter transactions (optional - if not provided, will check all accounts)
   */
  bankAccountUrl?: string;
  /**
   * Filter transactions by status/view
   * Valid values: "all", "unexplained", "explained", "manual", "imported", "marked_for_review"
   */
  view?: "all" | "unexplained" | "explained" | "manual" | "imported" | "marked_for_review";
  /**
   * Start date for transactions filter (YYYY-MM-DD format).
   * Use this for pagination - set to the day after the last transaction from the previous batch
   */
  fromDate?: string;
  /**
   * End date for transactions filter (YYYY-MM-DD format).
   * Use this for pagination - set to limit the date range for each batch
   */
  toDate?: string;
  /**
   * Maximum number of transactions to display per account (default: 50).
   * For pagination, use smaller values (10-20) to process data in manageable chunks
   */
  maxTransactions?: number;
};

/**
 * Get all bank transactions from FreeAgent accounts with filtering options.
 * This tool returns comprehensive transaction information including amounts, dates, descriptions, and statuses.
 *
 * For large datasets, use pagination by setting fromDate/toDate ranges and smaller maxTransactions values.
 * Example pagination workflow:
 * 1. First call: fromDate="2024-01-01", toDate="2024-01-31", maxTransactions=20
 * 2. Next call: fromDate="2024-02-01", toDate="2024-02-28", maxTransactions=20
 */
export default async function tool(input: Input = {}) {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    const view = input.view || "all";
    const maxTransactions = input.maxTransactions || MAX_TRANSACTIONS_TO_DISPLAY;

    let result = `🏦 **Bank Transactions** (View: ${view})\n\n`;

    // Add date range info if provided
    if (input.fromDate || input.toDate) {
      result += `📅 **Date Range**: ${input.fromDate || "All dates"} to ${input.toDate || "All dates"}\n\n`;
    }

    // Get bank accounts
    const accounts = await fetchBankAccounts(token);
    const accountsToCheck = input.bankAccountUrl
      ? accounts.filter((acc) => acc.url === input.bankAccountUrl)
      : accounts;

    if (accountsToCheck.length === 0) {
      return "❌ No bank accounts found or invalid bank account URL provided.";
    }

    let totalTransactions = 0;
    let totalUnexplained = 0;
    let totalMarkedForReview = 0;
    let anyAccountTruncated = false;

    for (const account of accountsToCheck) {
      try {
        result += `🏦 **${account.name}** (${account.bank_name || account.type})\n`;
        result += `   Account URL: ${account.url}\n`;

        const transactions = await fetchBankTransactions(token, account.url, view, input.fromDate, input.toDate);

        if (transactions.length === 0) {
          result += `   ✅ No transactions found\n\n`;
          continue;
        }

        // Count totals across all transactions (not just the displayed slice)
        for (const t of transactions) {
          if (t.unexplained_amount && parseFloat(t.unexplained_amount) > 0) {
            totalUnexplained++;
          }
          if (t.marked_for_review) {
            totalMarkedForReview++;
          }
        }

        result += `   📊 Total: ${transactions.length} transactions\n\n`;

        // Display transactions (limited by maxTransactions)
        const displayTransactions = transactions.slice(0, maxTransactions);

        for (const transaction of displayTransactions) {
          // Determine transaction status icon
          let statusIcon = "💰";
          let statusText = "";

          if (transaction.unexplained_amount && parseFloat(transaction.unexplained_amount) > 0) {
            statusIcon = "❗";
            statusText = " (Unexplained)";
          }
          if (transaction.is_manual) {
            statusIcon = "✏️";
            statusText += " (Manual)";
          }
          if (transaction.marked_for_review) {
            statusIcon = "🔍";
            statusText += " (Marked for Review)";
          }

          result += `   ${statusIcon} **${transaction.description}**${statusText}\n`;
          result += `      💵 Amount: ${transaction.amount}\n`;
          result += `      📅 Date: ${transaction.dated_on}\n`;
          result += `      🆔 Transaction ID: ${transaction.transaction_id}\n`;

          if (transaction.full_description && transaction.full_description !== transaction.description) {
            result += `      📝 Full Description: ${transaction.full_description}\n`;
          }

          if (transaction.unexplained_amount && parseFloat(transaction.unexplained_amount) > 0) {
            result += `      ❗ Unexplained Amount: ${transaction.unexplained_amount}\n`;
          }

          if (transaction.bank_transaction_explanations && transaction.bank_transaction_explanations.length > 0) {
            result += `      📋 Explanation URLs: ${transaction.bank_transaction_explanations.join(", ")}\n`;
          }

          result += `      🔗 Transaction URL: ${transaction.url}\n`;
          result += `\n`;
        }

        if (transactions.length > maxTransactions) {
          result += `   ... and ${transactions.length - maxTransactions} more transactions\n\n`;
          anyAccountTruncated = true;
        }

        totalTransactions += transactions.length;
      } catch (error) {
        result += `   ⚠️ Could not fetch transactions for ${account.name}\n`;
        result += `   Error: ${error instanceof Error ? error.message : String(error)}\n\n`;
      }
    }

    // Summary
    result += `📊 **Summary**\n`;
    result += `• Total Transactions: ${totalTransactions}\n`;
    result += `• Accounts Checked: ${accountsToCheck.length}\n`;

    if (totalUnexplained > 0) {
      result += `• ❗ Unexplained: ${totalUnexplained}\n`;
    }
    if (totalMarkedForReview > 0) {
      result += `• 🔍 Marked for Review: ${totalMarkedForReview}\n`;
    }

    result += `\n💡 **Available Actions:**\n`;
    result += `• Use **add-bank-transaction-explanation** for unexplained transactions\n`;
    result += `• Use **update-bank-transaction-explanation** for marked_for_review transactions\n`;
    result += `• Use **upload-attachment** to attach receipts or documents\n`;
    result += `• Use **update-bank-transaction** to mark transactions for review\n`;

    if (anyAccountTruncated) {
      result += `\n⚠️ **Note**: Only showing first ${maxTransactions} transactions per account. Use maxTransactions parameter to adjust this limit.\n`;
    }

    // Add pagination guidance
    result += `\n📄 **Pagination Tips:**\n`;
    result += `• For large datasets, use date ranges: fromDate="2024-01-01", toDate="2024-01-31"\n`;
    result += `• Use smaller maxTransactions (10-20) for manageable chunks\n`;
    result += `• Process data month by month for better performance\n`;
    result += `• Transactions are returned in date order (most recent first)\n`;

    return result;
  } catch (error) {
    console.error("Get all bank transactions error:", error);

    if (error instanceof Error) {
      if (error.message.includes("401") || error.message.includes("403")) {
        return `❌ Authentication failed. Please re-authenticate with FreeAgent.`;
      }
      if (error.message.includes("404")) {
        return `❌ Account not found. Please verify the bank account URL is correct.`;
      }
    }

    return `❌ Unable to fetch bank transactions. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
