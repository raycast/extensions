import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

type Input = {
  /**
   * Start date in YYYY-MM-DD format. If not provided, defaults to 1 year ago (365 days).
   */
  from?: string;
  /**
   * End date in YYYY-MM-DD format. If not provided, defaults to today.
   */
  to?: string;
  /**
   * Predefined date range shortcuts: "today", "yesterday", "this_week", "last_week", "this_month", "last_month", "last_7_days", "last_30_days", "last_90_days"
   * If provided, overrides 'from' and 'to' parameters.
   */
  dateRange?:
    | "today"
    | "yesterday"
    | "this_week"
    | "last_week"
    | "this_month"
    | "last_month"
    | "last_7_days"
    | "last_30_days"
    | "last_90_days"
    | "this_year"
    | "last_year"
    | "last_2_years"
    | "last_5_years"
    | "last_10_years"
    | "all_time";
  /**
   * Filter by entry type: "expense", "income", "transfer", or "all". Defaults to "all".
   */
  type?: "expense" | "income" | "transfer" | "all";
  /**
   * Filter by category names (comma-separated). Example: "Food,Transport,Entertainment"
   */
  categories?: string;
  /**
   * Filter by tag names (comma-separated). Example: "Work,Personal,Urgent"
   */
  tags?: string;
  /**
   * Filter by account names (comma-separated). Example: "Cash,Credit Card,Savings"
   */
  accounts?: string;
  /**
   * Maximum number of entries to return. Defaults to 50, max 200.
   */
  limit?: number;
  /**
   * Search in description. Case-insensitive server-side match.
   */
  search?: string;
  /**
   * Include summary statistics. Defaults to true.
   */
  includeSummary?: boolean;
};

function getDateRange(input: Input): { from: string; to: string } {
  const today = new Date();
  const formatDate = (d: Date) => format(d, "yyyy-MM-dd");

  // Prioritize explicit from/to dates if provided
  if (input.from || input.to) {
    return {
      from: input.from || formatDate(subDays(today, 365)),
      to: input.to || formatDate(today),
    };
  }

  // Prioritize explicit from/to dates if provided
  if (input.from || input.to) {
    return {
      from: input.from || formatDate(subDays(today, 365)),
      to: input.to || formatDate(today),
    };
  }

  if (input.dateRange) {
    switch (input.dateRange) {
      case "today":
        return { from: formatDate(today), to: formatDate(today) };
      case "yesterday": {
        const yesterday = subDays(today, 1);
        return { from: formatDate(yesterday), to: formatDate(yesterday) };
      }
      case "this_week":
        return {
          from: formatDate(startOfWeek(today, { weekStartsOn: 1 })),
          to: formatDate(endOfWeek(today, { weekStartsOn: 1 })),
        };
      case "last_week": {
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        return { from: formatDate(lastWeekStart), to: formatDate(lastWeekEnd) };
      }
      case "this_month":
        return { from: formatDate(startOfMonth(today)), to: formatDate(endOfMonth(today)) };
      case "last_month": {
        const lastMonth = subMonths(today, 1);
        return { from: formatDate(startOfMonth(lastMonth)), to: formatDate(endOfMonth(lastMonth)) };
      }
      case "last_7_days":
        return { from: formatDate(subDays(today, 7)), to: formatDate(today) };
      case "last_30_days":
        return { from: formatDate(subDays(today, 30)), to: formatDate(today) };
      case "last_90_days":
        return { from: formatDate(subDays(today, 90)), to: formatDate(today) };
      case "this_year":
        return { from: formatDate(new Date(today.getFullYear(), 0, 1)), to: formatDate(today) };
      case "last_year": {
        const lastYear = today.getFullYear() - 1;
        return { from: formatDate(new Date(lastYear, 0, 1)), to: formatDate(new Date(lastYear, 11, 31)) };
      }
      case "last_2_years":
        return { from: formatDate(subDays(today, 365 * 2)), to: formatDate(today) };
      case "last_5_years":
        return { from: formatDate(subDays(today, 365 * 5)), to: formatDate(today) };
      case "last_10_years":
        return { from: formatDate(subDays(today, 365 * 10)), to: formatDate(today) };
      case "all_time":
        // Toshl started around 2012, so 2000 is safe enough
        return { from: "2000-01-01", to: formatDate(today) };
    }
  }

  // Changed default from 30 days to 365 days to ensure context is not missed
  return {
    from: input.from || formatDate(subDays(today, 365)),
    to: input.to || formatDate(today),
  };
}

export default async function searchEntries(input: Input) {
  const { from, to } = getDateRange(input);
  const limit = Math.min(input.limit || 50, 200);
  const type = input.type || "all";
  const includeSummary = input.includeSummary !== false;

  // Fetch metadata first to resolve names to IDs
  const [allCategories, allTags, allAccounts] = await Promise.all([
    toshl.getCategories(),
    toshl.getTags(),
    toshl.getAccounts(),
  ]);

  // Create reverse lookup maps (ID -> Name) for formatting output
  const categoryIdNameMap = new Map(allCategories.map((c) => [c.id, c.name]));
  const tagIdNameMap = new Map(allTags.map((t) => [t.id, t.name]));
  const accountIdNameMap = new Map(allAccounts.map((a) => [a.id, a.name]));

  // Helper to resolve comma-separated names to IDs with partial matching
  const resolveIds = (inputStr: string | undefined, items: { id: string; name: string }[]) => {
    if (!inputStr) return undefined;
    const searchTerms = inputStr.split(",").map((s) => s.trim().toLowerCase());
    const matchedIds = new Set<string>();

    searchTerms.forEach((term) => {
      items.forEach((item) => {
        if (item.name.toLowerCase().includes(term)) {
          matchedIds.add(item.id);
        }
      });
    });

    return matchedIds.size > 0 ? Array.from(matchedIds).join(",") : undefined;
  };

  const categoryIds = resolveIds(input.categories, allCategories);
  const tagIds = resolveIds(input.tags, allTags);
  const accountIds = resolveIds(input.accounts, allAccounts);

  // Fetch data with server-side filtering
  const entries = await toshl.getTransactions({
    from,
    to,
    per_page: limit,
    search: input.search,
    categories: categoryIds,
    tags: tagIds,
    accounts: accountIds,
    type: type !== "all" ? type : undefined,
  });

  // Format entries for output
  const formattedEntries = entries.map((entry) => {
    const isTransfer = "transaction" in entry;
    let entryType: string;
    if (isTransfer) {
      entryType = "transfer";
    } else if (entry.amount < 0) {
      entryType = "expense";
    } else {
      entryType = "income";
    }

    return {
      id: entry.id,
      date: entry.date.substring(0, 10), // Ensure YYYY-MM-DD only, no time
      description: entry.desc || "No description",
      amount: entry.amount,
      absAmount: Math.abs(entry.amount),
      currency: entry.currency.code,
      type: entryType,
      category: categoryIdNameMap.get(entry.category) || "Unknown",
      tags: (entry.tags || []).map((tid) => tagIdNameMap.get(tid) || "Unknown"),
      account: accountIdNameMap.get(entry.account) || "Unknown",
      isRecurring: !!entry.repeat,
    };
  });

  // Calculate summary based on the returned entries
  let summary = {};
  if (includeSummary) {
    const expenses = formattedEntries.filter((e) => e.type === "expense");
    const incomes = formattedEntries.filter((e) => e.type === "income");
    const transfers = formattedEntries.filter((e) => e.type === "transfer");

    const totalExpenses = expenses.reduce((sum, e) => sum + e.absAmount, 0);
    const totalIncome = incomes.reduce((sum, e) => sum + e.absAmount, 0);

    // Group by category
    const expenseByCategory: { [key: string]: number } = {};
    expenses.forEach((e) => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.absAmount;
    });

    const incomeByCategory: { [key: string]: number } = {};
    incomes.forEach((e) => {
      incomeByCategory[e.category] = (incomeByCategory[e.category] || 0) + e.absAmount;
    });

    // Get top categories
    const topExpenseCategories = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    const topIncomeCategories = Object.entries(incomeByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    summary = {
      period: `${from} to ${to}`,
      totalEntries: formattedEntries.length,
      explanation: "Summary is based on the matched entries (limited by pagination).",
      expenseCount: expenses.length,
      incomeCount: incomes.length,
      transferCount: transfers.length,
      totalExpenses,
      totalIncome,
      netChange: totalIncome - totalExpenses,
      topExpenseCategories,
      topIncomeCategories,
    };
  }

  return {
    ...(includeSummary ? { summary } : {}),
    entries: formattedEntries,
    _instructions: AI_INSTRUCTIONS,
  };
}
