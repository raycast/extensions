import { LocalStorage } from '@raycast/api';
import { fetchTransactions } from '../lib/api';
import { Period } from '../types';

type GetTransactionDetailsInput = {
  /**
   * The unique identifier of the transaction to retrieve
   */
  transaction_id: string;
};

/**
 * Get detailed information about a specific YNAB transaction
 * @param input The input parameters containing the transaction ID
 * @returns Detailed information about the specified transaction
 */
export default async function (input: GetTransactionDetailsInput) {
  try {
    const storedBudgetId = await LocalStorage.getItem<string>('activeBudgetId');
    const activeBudgetId = storedBudgetId?.replace(/["']/g, '');

    if (!activeBudgetId) {
      return {
        success: false,
        error: 'No active budget found',
        transaction: null,
      };
    }

    const transactions = (await fetchTransactions(activeBudgetId, 'current' as Period)) || [];
    const transaction = transactions.find((t) => t.id === input.transaction_id);

    if (!transaction) {
      return {
        success: false,
        error: 'Transaction not found',
        transaction: null,
      };
    }

    return {
      success: true,
      transaction,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      transaction: null,
    };
  }
}
