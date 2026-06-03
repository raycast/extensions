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
  const [{ transactions, details }, accounts] = await Promise.all([
    fetchTransactions(input),
    getCachedAccounts({ includeUnsupported: true }),
  ]);
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  return {
    page: details.page,
    perPage: details.per_page,
    totalCount: details.transactions_count,
    totalAmount: details.transactions_total,
    startDate: details.start_date,
    endDate: details.end_date,
    transactions: transactions.map((transaction) => {
      const account = accountById.get(transaction.account_id);
      return {
        id: transaction.id,
        date: transaction.date,
        amount: transaction.amount,
        description: transaction.description_pretty || transaction.description_guest || transaction.description_raw,
        rawDescription: transaction.description_raw,
        categoryId: transaction.category_id,
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
