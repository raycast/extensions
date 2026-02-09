import { toshl } from "../utils/toshl";
import { parseAmount, formatDisplayAmount, AI_INSTRUCTIONS } from "../utils/helpers";
import { format } from "date-fns";

type Input = {
  /**
   * The amount of money spent. MUST be a number or string number (e.g., "50000", "1500000").
   * Do NOT use shortcuts like '50k' or '3tr'. Convert them to full numeric values.
   */
  amount: string;
  /**
   * What the expense was for (e.g., "lunch", "cơm trưa").
   */
  description: string;
  /**
   * Category ID from list-categories-tags. Use exact ID for reliable matching.
   */
  categoryId?: string;
  /**
   * Tag IDs from list-categories-tags, comma-separated. Use exact IDs for reliable matching.
   */
  tagIds?: string;
  /**
   * Account ID from list-categories-tags. Use exact ID for reliable matching.
   */
  accountId?: string;
  /**
   * Currency code (e.g., "USD", "VND"). Defaults to VND.
   */
  currency?: string;
  /**
   * Date of transaction in YYYY-MM-DD format (e.g., "2023-10-27").
   * Default to today if not provided.
   */
  date?: string;
};

export default async function addExpense(input: Input) {
  // Get user's default currency from Toshl API
  const apiDefaultCurrency = await toshl.getDefaultCurrency();
  const { amount, description, categoryId, tagIds, accountId, currency = apiDefaultCurrency, date } = input;
  const parsedAmount = parseAmount(amount);
  const parsedDate = date || format(new Date(), "yyyy-MM-dd");

  // Fetch categories, tags, accounts from Toshl
  const [categories, allTags, accounts] = await Promise.all([
    toshl.getCategories(),
    toshl.getTags(),
    toshl.getAccounts(),
  ]);

  // Filter for expense types
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const expenseTags = allTags.filter((t) => t.type === "expense");

  // Build payload
  const payload: {
    amount: number;
    currency: { code: string };
    date: string;
    desc: string;
    category?: string;
    tags?: string[];
    account?: string;
  } = {
    amount: -Math.abs(parsedAmount),
    currency: { code: currency },
    date: parsedDate,
    desc: description,
  };

  // Use category ID if provided
  let matchedCategory: { id: string; name: string } | undefined;
  if (categoryId) {
    const found = expenseCategories.find((c) => c.id === categoryId);
    if (found) {
      payload.category = found.id;
      matchedCategory = found;
    }
  }

  // Use tag IDs if provided
  const matchedTags: { id: string; name: string }[] = [];
  if (tagIds) {
    const ids = tagIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    for (const id of ids) {
      const found = expenseTags.find((t) => t.id === id);
      if (found) {
        matchedTags.push(found);
      }
    }
    if (matchedTags.length > 0) {
      payload.tags = matchedTags.map((t) => t.id);
    }
  }

  // Use account ID if provided, otherwise use default
  let matchedAccount: { id: string; name: string } | undefined;
  if (accountId) {
    const found = accounts.find((a) => a.id === accountId);
    if (found) {
      payload.account = found.id;
      matchedAccount = found;
    }
  }
  if (!payload.account && accounts.length > 0) {
    payload.account = accounts[0].id;
    matchedAccount = accounts[0];
  }

  const result = await toshl.addTransaction(payload);

  return {
    success: true,
    message: `Đã thêm chi tiêu: ${description} - ${formatDisplayAmount(parsedAmount, currency)}`,
    transactionId: result.id,
    date: parsedDate,
    category: matchedCategory?.name || "⚠️ No category (use list-categories-tags to get IDs)",
    tags: matchedTags.map((t) => t.name).join(", ") || "None",
    account: matchedAccount?.name || "Default",
    availableCategories: expenseCategories.map((c) => ({ id: c.id, name: c.name })),
    _instructions: AI_INSTRUCTIONS,
  };
}
