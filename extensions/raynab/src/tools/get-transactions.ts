import { LocalStorage } from '@raycast/api';
import { fetchTransactions } from '../lib/api';
import { Period } from '../types';
import { formatToReadableAmount } from '../lib/utils/transactions';
import type { CurrencyFormat } from '@srcTypes';

type GetTransactionsInput = {
  /**
   * Filter type for transactions
   * - 'active': Shows unapproved or uncategorized transactions
   */
  filter?: string;
  /**
   * Optional payee name to filter transactions
   */
  payee?: string;
  /**
   * Optional category name to filter transactions
   */
  category?: string;
  /**
   * Optional period to fetch transactions for
   */
  period?: Period;
};

/**
 * Get transactions from YNAB based on the specified filter
 * @param input The input parameters for filtering transactions
 * @returns A list of transactions matching the filter criteria
 */
export default async function (input: GetTransactionsInput) {
  try {
    const storedBudgetId = await LocalStorage.getItem<string>('activeBudgetId');
    const activeBudgetId = storedBudgetId?.replace(/["']/g, '');

    if (!activeBudgetId) {
      return {
        success: false,
        error: 'No active budget found',
        transactions: [],
      };
    }

    const storedCurrency = await LocalStorage.getItem<string>('activeBudgetCurrency');
    const activeBudgetCurrency = storedCurrency ? (JSON.parse(storedCurrency) as CurrencyFormat) : null;

    const period = input.period || 'month';

    const transactions = (await fetchTransactions(activeBudgetId, period)) || [];

    // First filter by payee and/or category if provided
    let filteredTransactions = transactions;

    if (input.payee) {
      const payeeLower = input.payee.toLowerCase();
      filteredTransactions = filteredTransactions.filter((t) => {
        const matches =
          t.payee_name?.toLowerCase().includes(payeeLower) || t.payee_id?.toLowerCase().includes(payeeLower);
        return matches;
      });
    }

    if (input.category) {
      const categoryLower = input.category.toLowerCase();
      filteredTransactions = filteredTransactions.filter((t) => {
        const matches =
          t.category_name?.toLowerCase().includes(categoryLower) ||
          t.category_id?.toLowerCase().includes(categoryLower);
        return matches;
      });
    }

    // Then apply the main filter if specified
    if (input.filter === 'active') {
      // Get active (unapproved/uncategorized) transactions
      filteredTransactions = filteredTransactions.filter((t) => !t.approved || !t.category_id);
    }

    // Sort by date in descending order
    filteredTransactions = filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const result = {
      success: true,
      transactions: filteredTransactions.map((t) => ({
        ...t,
        amount: formatToReadableAmount({ amount: t.amount, currency: activeBudgetCurrency }),
      })),
    };
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      transactions: [],
    };
  }
}
