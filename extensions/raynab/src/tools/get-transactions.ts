import { LocalStorage } from '@raycast/api';
import { fetchTransactions } from '../lib/api';
import { Period } from '../types';

type GetTransactionsInput = {
  /**
   * Filter type for transactions
   * - 'active': Shows unapproved or uncategorized transactions
   * - 'recent': Shows the 10 most recent transactions by date
   */
  filter: 'active' | 'recent';
  /**
   * Optional payee name to filter transactions
   */
  payee?: string;
  /**
   * Optional category name to filter transactions
   */
  category?: string;
  /**
   * Optional query string that might contain period information
   */
  query?: string;
};

/**
 * Detects period from query string
 * @param query The input query string
 * @returns Detected period or 'month' as default
 */
function detectPeriodFromQuery(query?: string): Period {
  if (!query) return 'month';

  const queryLower = query.toLowerCase();

  if (queryLower.includes('last year') || queryLower.includes('past year')) return 'year';
  if (queryLower.includes('last quarter') || queryLower.includes('past quarter')) return 'quarter';
  if (queryLower.includes('last month') || queryLower.includes('past month')) return 'month';
  if (queryLower.includes('last week') || queryLower.includes('past week')) return 'week';
  if (
    queryLower.includes('last day') ||
    queryLower.includes('past day') ||
    queryLower.includes('yesterday') ||
    queryLower.includes('today')
  )
    return 'day';

  return 'month';
}

/**
 * Get transactions from YNAB based on the specified filter
 * @param input The input parameters for filtering transactions
 * @returns A list of transactions matching the filter criteria
 */
export default async function (input: GetTransactionsInput) {
  try {
    console.log('get-transactions tool called with:', input);

    const storedBudgetId = await LocalStorage.getItem<string>('activeBudgetId');
    const activeBudgetId = storedBudgetId?.replace(/["']/g, '');

    if (!activeBudgetId) {
      console.log('No active budget found');
      return {
        success: false,
        error: 'No active budget found',
        transactions: [],
      };
    }

    // Detect period from query if available
    const period = detectPeriodFromQuery(input.query);
    console.log(`Detected period: ${period}`);

    const transactions = (await fetchTransactions(activeBudgetId, period)) || [];
    console.log(`Fetched ${transactions.length} total transactions from the last ${period}`);

    // First filter by payee and/or category if provided
    let filteredTransactions = transactions;

    if (input.payee) {
      const payeeLower = input.payee.toLowerCase();
      console.log(`Filtering by payee: ${input.payee}`);
      filteredTransactions = filteredTransactions.filter((t) => {
        const matches =
          t.payee_name?.toLowerCase().includes(payeeLower) || t.payee_id?.toLowerCase().includes(payeeLower);
        if (matches) {
          console.log(`Found matching transaction: ${t.payee_name} (${t.date})`);
        }
        return matches;
      });
      console.log(`Found ${filteredTransactions.length} transactions matching payee`);
    }

    if (input.category) {
      const categoryLower = input.category.toLowerCase();
      console.log(`Filtering by category: ${input.category}`);
      filteredTransactions = filteredTransactions.filter((t) => {
        const matches =
          t.category_name?.toLowerCase().includes(categoryLower) ||
          t.category_id?.toLowerCase().includes(categoryLower);
        if (matches) {
          console.log(`Found matching transaction: ${t.category_name} (${t.date})`);
        }
        return matches;
      });
      console.log(`Found ${filteredTransactions.length} transactions matching category`);
    }

    // Then apply the main filter
    if (input.filter === 'recent') {
      // Sort by date in descending order and take the 10 most recent
      filteredTransactions = filteredTransactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);
      console.log(`Returning ${filteredTransactions.length} most recent transactions`);
    } else {
      // Get active (unapproved/uncategorized) transactions
      filteredTransactions = filteredTransactions.filter((t) => !t.approved || !t.category_id);
      console.log(`Returning ${filteredTransactions.length} active transactions`);
    }

    const result = {
      success: true,
      transactions: filteredTransactions,
    };
    console.log('get-transactions tool returned with:', {
      ...result,
      transactions: result.transactions.map((t) => ({
        payee: t.payee_name,
        date: t.date,
        amount: t.amount,
      })),
    });
    return result;
  } catch (error) {
    console.error('Error in get-transactions tool:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      transactions: [],
    };
  }
}
