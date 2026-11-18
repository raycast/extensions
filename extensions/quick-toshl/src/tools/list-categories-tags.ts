import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";

type Input = {
  /**
   * Type of data to list: 'categories', 'tags', 'accounts', or 'all'. Defaults to 'all'.
   */
  type?: string;
  /**
   * Filter by expense or income type. Only applies to categories and tags. Options: 'expense', 'income', or 'all'. Defaults to 'all'.
   */
  entryType?: string;
};

export default async function listCategoriesAndTags(input: Input) {
  const { type = "all", entryType = "all" } = input;

  const results: {
    categories?: { name: string; type: string; id: string }[];
    tags?: { name: string; type: string; category: string; id: string }[];
    accounts?: { name: string; currency: string; id: string }[];
  } = {};

  if (type === "all" || type === "categories") {
    const categories = await toshl.getCategories();
    const filtered = entryType === "all" ? categories : categories.filter((c) => c.type === entryType);

    results.categories = filtered.map((c) => ({
      name: c.name,
      type: c.type,
      id: c.id,
    }));
  }

  if (type === "all" || type === "tags") {
    const tags = await toshl.getTags();
    const categories = await toshl.getCategories();

    const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || "Unknown";

    const filtered = entryType === "all" ? tags : tags.filter((t) => t.type === entryType);

    results.tags = filtered.map((t) => ({
      name: t.name,
      type: t.type,
      category: getCategoryName(t.category),
      id: t.id,
    }));
  }

  if (type === "all" || type === "accounts") {
    const accounts = await toshl.getAccounts();
    results.accounts = accounts.map((a) => ({
      name: a.name,
      currency: a.currency.code,
      id: a.id,
    }));
  }

  // Build summary
  const summary: string[] = [];

  if (results.categories) {
    const expenseCategories = results.categories.filter((c) => c.type === "expense");
    const incomeCategories = results.categories.filter((c) => c.type === "income");
    summary.push(`📁 Categories: ${expenseCategories.length} expense, ${incomeCategories.length} income`);
  }

  if (results.tags) {
    const expenseTags = results.tags.filter((t) => t.type === "expense");
    const incomeTags = results.tags.filter((t) => t.type === "income");
    summary.push(`🏷️ Tags: ${expenseTags.length} expense, ${incomeTags.length} income`);
  }

  if (results.accounts) {
    summary.push(`💳 Accounts: ${results.accounts.length}`);
  }

  return {
    summary: summary.join("\n"),
    ...results,
    _instructions: AI_INSTRUCTIONS,
  };
}
