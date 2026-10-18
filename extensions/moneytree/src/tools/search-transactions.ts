import { fetchTransactions, getCachedAccounts } from "../lib/moneytree";

type Input = {
  /**
   * Search text to match Moneytree transactions by merchant or description.
   */
  query?: string;
  /**
   * Restrict results to a Moneytree account id.
   */
  accountId?: number;
  /**
   * Restrict results to one Moneytree category id from get-categories or get-budgets. Use this for spending in a
   * category or budget; category names are not searchable as text. Matches only that category, not its subcategories,
   * the same way Moneytree budgets count spending.
   */
  categoryId?: number;
  /**
   * Start date in YYYY-MM-DD format. Defaults to 30 days ago, or six months ago when filtered.
   */
  startDate?: string;
  /**
   * End date in YYYY-MM-DD format. Defaults to today.
   */
  endDate?: string;
  /**
   * First result page to fetch. Defaults to 1.
   */
  page?: number;
  /**
   * Number of 25-transaction pages to fetch, between 1 and 10. Defaults to 1.
   */
  maxPages?: number;
};

/**
 * Search Moneytree transactions and return signed amounts, dates, descriptions, category ids, and account context.
 */
export default async function tool(input: Input = {}) {
  const { categoryId, ...query } = input;
  // The transactions endpoint has no category filter, so read the whole range (up to 10 pages) and filter here.
  const [result, accounts] = await Promise.all([
    fetchTransactions(categoryId === undefined ? query : { ...query, page: 1, maxPages: 10 }),
    getCachedAccounts({ includeUnsupported: true }),
  ]);
  const { details } = result;
  const transactions =
    categoryId === undefined
      ? result.transactions
      : result.transactions.filter((transaction) => transaction.category_id === categoryId);
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  return {
    page: details.page,
    perPage: details.per_page,
    categoryId,
    totalCount: categoryId === undefined ? details.transactions_count : transactions.length,
    totalAmount:
      categoryId === undefined
        ? details.transactions_total
        : transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    ...(categoryId !== undefined && {
      complete: result.transactions.length >= details.transactions_count,
    }),
    startDate: details.start_date,
    endDate: details.end_date,
    transactions: transactions.map((transaction) => {
      const account = accountById.get(transaction.account_id);
      return {
        id: transaction.id,
        date: transaction.date,
        amount: transaction.amount,
        description: transaction.description_pretty || transaction.description_guest || transaction.description_raw,
        descriptionGuest: transaction.description_guest,
        descriptionPretty: transaction.description_pretty,
        rawDescription: transaction.description_raw,
        categoryId: transaction.category_id,
        claimId: transaction.claim_id,
        expenseType: transaction.expense_type,
        accountId: transaction.account_id,
        accountName: account?.nickname || account?.institution_account_name,
        credentialName: account?.credentialName,
        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at,
      };
    }),
  };
}
