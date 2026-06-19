import { fetchBankTransactions, fetchBankAccounts } from "../services/freeagent";
import { formatCurrencyAmount, formatDate } from "../utils/formatting";
import { provider } from "../oauth";
import { BankTransaction } from "../types";

type Input = {
  /**
   * Search query for transaction descriptions, amounts, or vendors
   */
  searchQuery?: string;
  /**
   * Number of days to look back (default: 180)
   */
  searchDays?: number;
  /**
   * Filter by transaction type
   */
  transactionType?: "income" | "expense" | "all";
  /**
   * Minimum amount to include in search
   */
  minAmount?: number;
  /**
   * Maximum amount to include in search
   */
  maxAmount?: number;
};

/**
 * Search through previously explained bank transactions to find patterns and provide context for understanding transaction explanations
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

    // Derive the date range up front so the server filters out older transactions.
    const searchDays = input.searchDays || 180;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - searchDays);
    const fromDateStr = cutoffDate.toISOString().split("T")[0];

    let explainedTransactions: (BankTransaction & { account_name: string })[] = [];

    // Fetch explained transactions from all accounts within the search window
    for (const account of bankAccounts) {
      try {
        const transactions = await fetchBankTransactions(token, account.url, "explained", fromDateStr);
        explainedTransactions = explainedTransactions.concat(
          transactions.map((t) => ({ ...t, account_name: account.name })),
        );
      } catch (error) {
        console.warn(`Failed to fetch explained transactions for ${account.name}:`, error);
      }
    }

    if (explainedTransactions.length === 0) {
      return "📊 No explained transactions found in your FreeAgent accounts.";
    }

    let filteredTransactions = explainedTransactions;

    // Apply search filters
    if (input.searchQuery) {
      const query = input.searchQuery.toLowerCase();
      filteredTransactions = filteredTransactions.filter((transaction) => {
        const description = transaction.description.toLowerCase();
        const amount = Math.abs(parseFloat(transaction.amount)).toString();

        return (
          description.includes(query) ||
          amount.includes(query.replace(/[£$€,]/g, "")) ||
          transaction.transaction_id?.toLowerCase().includes(query)
        );
      });
    }

    // Filter by transaction type
    if (input.transactionType && input.transactionType !== "all") {
      filteredTransactions = filteredTransactions.filter((transaction) => {
        const amount = parseFloat(transaction.amount);
        return input.transactionType === "income" ? amount > 0 : amount < 0;
      });
    }

    // Filter by amount range
    if (input.minAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter((transaction) => {
        return Math.abs(parseFloat(transaction.amount)) >= input.minAmount!;
      });
    }

    if (input.maxAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter((transaction) => {
        return Math.abs(parseFloat(transaction.amount)) <= input.maxAmount!;
      });
    }

    if (filteredTransactions.length === 0) {
      return `🔍 No explained transactions found matching your search criteria.`;
    }

    // Sort by date (most recent first)
    filteredTransactions.sort((a, b) => new Date(b.dated_on).getTime() - new Date(a.dated_on).getTime());

    const currency = bankAccounts[0]?.currency || "GBP";
    let analysis = `🔍 **Explained Transaction Search Results**\n\n`;

    analysis += `📊 **Search Summary**\n`;
    if (input.searchQuery) {
      analysis += `• Query: "${input.searchQuery}"\n`;
    }
    analysis += `• Found ${filteredTransactions.length} explained transaction(s)\n`;
    analysis += `• Search period: Last ${searchDays} days\n`;
    if (input.transactionType && input.transactionType !== "all") {
      analysis += `• Type: ${input.transactionType === "income" ? "Income only" : "Expenses only"}\n`;
    }
    if (input.minAmount !== undefined || input.maxAmount !== undefined) {
      const min = input.minAmount !== undefined ? formatCurrencyAmount(currency, input.minAmount) : "any";
      const max = input.maxAmount !== undefined ? formatCurrencyAmount(currency, input.maxAmount) : "any";
      analysis += `• Amount range: ${min} to ${max}\n`;
    }
    analysis += `\n`;

    // Show individual transactions
    analysis += `📋 **Transaction Details**\n`;
    const transactionsToShow = filteredTransactions.slice(0, 10);

    for (const transaction of transactionsToShow) {
      const amount = parseFloat(transaction.amount);
      const amountStr = formatCurrencyAmount(currency, Math.abs(amount));
      const direction = amount > 0 ? "💰 Income" : "💸 Expense";

      analysis += `${amount > 0 ? "🔵" : "🔴"} **${direction}: ${amountStr}**\n`;
      analysis += `📅 Date: ${formatDate(transaction.dated_on)}\n`;
      analysis += `📝 Description: "${transaction.description}"\n`;
      analysis += `🏦 Account: ${transaction.account_name}\n`;
      analysis += `🏦 Bank account url: ${transaction.bank_account}\n`;

      // Show explanation details if available
      if (transaction.bank_transaction_explanations && transaction.bank_transaction_explanations.length > 0) {
        analysis += `💡 **Previous Explanations**:\n`;
        transaction.bank_transaction_explanations.slice(0, 2).forEach((explanation: string) => {
          analysis += `   • ${explanation}\n`;
        });
      }

      analysis += `\n`;
    }

    if (filteredTransactions.length > 10) {
      analysis += `... and ${filteredTransactions.length - 10} more explained transactions\n\n`;
    }

    // Generate insights and patterns
    analysis += `🎯 **Insights & Patterns**\n`;

    // Analyze spending patterns
    const expenseTransactions = filteredTransactions.filter((t) => parseFloat(t.amount) < 0);
    const incomeTransactions = filteredTransactions.filter((t) => parseFloat(t.amount) > 0);

    if (expenseTransactions.length > 0) {
      const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      analysis += `• **Total Expenses**: ${formatCurrencyAmount(currency, totalExpenses)} (${expenseTransactions.length} transactions)\n`;

      // Top expense categories
      const expenseCategories = categorizeTransactions(expenseTransactions);
      if (expenseCategories.length > 0) {
        analysis += `• **Top Expense Categories**:\n`;
        expenseCategories.slice(0, 3).forEach((category) => {
          analysis += `   - ${category.name}: ${formatCurrencyAmount(currency, category.total)} (${category.count} transactions)\n`;
        });
      }
    }

    if (incomeTransactions.length > 0) {
      const totalIncome = incomeTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      analysis += `• **Total Income**: ${formatCurrencyAmount(currency, totalIncome)} (${incomeTransactions.length} transactions)\n`;
    }

    // Identify frequent vendors/counterparties
    const vendors = identifyFrequentVendors(filteredTransactions);
    if (vendors.length > 0) {
      analysis += `• **Frequent Vendors/Clients**:\n`;
      vendors.slice(0, 3).forEach((vendor) => {
        analysis += `   - ${vendor.name}: ${vendor.count} transactions, ${formatCurrencyAmount(currency, Math.abs(vendor.total))}\n`;
      });
    }

    // Monthly breakdown if enough data
    const monthlyData = generateMonthlyBreakdown(filteredTransactions);
    if (monthlyData.length > 1) {
      analysis += `• **Monthly Breakdown**:\n`;
      monthlyData.slice(0, 3).forEach((month) => {
        analysis += `   - ${month.month}: ${month.count} transactions, Net ${formatCurrencyAmount(currency, month.net)}\n`;
      });
    }

    // Recommendations based on patterns
    analysis += `\n💡 **Recommendations**\n`;

    if (input.searchQuery) {
      analysis += `• Use these explained transactions as templates for similar future transactions\n`;
      analysis += `• Consider setting up automatic categorization rules for recurring patterns\n`;
    } else {
      analysis += `• Review transaction patterns to identify business trends\n`;
      analysis += `• Use historical explanations to improve future transaction categorization\n`;
    }

    if (expenseTransactions.length > incomeTransactions.length * 2) {
      analysis += `• Consider monitoring expense-to-income ratio\n`;
    }

    const recurringTransactions = identifyRecurringTransactions(filteredTransactions);
    if (recurringTransactions.length > 0) {
      analysis += `• ${recurringTransactions.length} potential recurring transactions identified - consider automation\n`;
    }

    return analysis;
  } catch (error) {
    console.error("Search explained transactions error:", error);
    return `❌ Unable to search explained transactions. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function categorizeTransactions(
  transactions: (BankTransaction & { account_name: string })[],
): { name: string; total: number; count: number }[] {
  const categories: { [key: string]: { total: number; count: number } } = {};

  transactions.forEach((transaction) => {
    const description = transaction.description.toLowerCase();
    const amount = Math.abs(parseFloat(transaction.amount));

    let category = "Other";

    if (/subscription|saas|software|monthly|annual/.test(description)) {
      category = "Software & Subscriptions";
    } else if (/office|supplies|stationery|equipment/.test(description)) {
      category = "Office Expenses";
    } else if (/travel|hotel|flight|train|transport|taxi|uber/.test(description)) {
      category = "Travel & Transport";
    } else if (/marketing|advertising|facebook|google|linkedin/.test(description)) {
      category = "Marketing";
    } else if (/utility|electric|gas|internet|phone|broadband/.test(description)) {
      category = "Utilities";
    } else if (/bank|fee|charge|interest|commission/.test(description)) {
      category = "Bank Charges";
    } else if (/payroll|salary|wages|pension/.test(description)) {
      category = "Payroll";
    } else if (/professional|legal|accounting|consultant/.test(description)) {
      category = "Professional Services";
    }

    if (!categories[category]) {
      categories[category] = { total: 0, count: 0 };
    }
    categories[category].total += amount;
    categories[category].count++;
  });

  return Object.entries(categories)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total);
}

function identifyFrequentVendors(
  transactions: (BankTransaction & { account_name: string })[],
): { name: string; count: number; total: number }[] {
  const vendors: { [key: string]: { count: number; total: number } } = {};

  transactions.forEach((transaction) => {
    // Extract potential vendor name from description
    const description = transaction.description;
    const amount = parseFloat(transaction.amount);

    // Simple vendor extraction - first few words or until special characters
    const vendorMatch = description.match(/^([A-Za-z\s&]+?)[\s\-*\d]/);
    const vendor = vendorMatch ? vendorMatch[1].trim() : description.substring(0, 20);

    if (vendor.length > 2) {
      if (!vendors[vendor]) {
        vendors[vendor] = { count: 0, total: 0 };
      }
      vendors[vendor].count++;
      vendors[vendor].total += amount;
    }
  });

  return Object.entries(vendors)
    .filter(([, data]) => data.count > 1) // Only show vendors with multiple transactions
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);
}

function generateMonthlyBreakdown(
  transactions: (BankTransaction & { account_name: string })[],
): { month: string; income: number; expenses: number; count: number; net: number }[] {
  const monthlyData: { [key: string]: { income: number; expenses: number; count: number } } = {};

  transactions.forEach((transaction) => {
    const date = new Date(transaction.dated_on);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0, count: 0 };
    }

    const amount = parseFloat(transaction.amount);
    if (amount > 0) {
      monthlyData[monthKey].income += amount;
    } else {
      monthlyData[monthKey].expenses += Math.abs(amount);
    }
    monthlyData[monthKey].count++;
  });

  return Object.entries(monthlyData)
    .sort((a, b) => b[0].localeCompare(a[0])) // Sort by month desc
    .map(([monthKey, data]) => {
      const [year, month] = monthKey.split("-");
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      return {
        month: monthName,
        count: data.count,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
      };
    });
}

function identifyRecurringTransactions(
  transactions: (BankTransaction & { account_name: string })[],
): { description: string; count: number; averageAmount: number; dates: string[] }[] {
  const patterns: { [key: string]: (BankTransaction & { account_name: string })[] } = {};

  transactions.forEach((transaction) => {
    // Create pattern key based on similar amount and description
    const amount = Math.round(Math.abs(parseFloat(transaction.amount)));
    const description = transaction.description.toLowerCase().substring(0, 15);
    const key = `${amount}-${description.replace(/\d+/g, "X")}`;

    if (!patterns[key]) {
      patterns[key] = [];
    }
    patterns[key].push(transaction);
  });

  return Object.values(patterns)
    .filter((group) => group.length > 1)
    .map((group) => ({
      description: group[0].description,
      count: group.length,
      averageAmount: group.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) / group.length,
      dates: group.map((t) => t.dated_on).slice(0, 5), // Show up to 5 dates
    }));
}
