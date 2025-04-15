import { LocalStorage } from '@raycast/api';
import { fetchTransactions, fetchAccounts } from '../lib/api';
import { formatToReadableAmount } from '../lib/utils/transactions';
import type { CurrencyFormat, Period } from '@srcTypes';

interface BigNumbersOutput {
  success: boolean;
  today: string;
  thisWeek: string;
  thisMonth: string;
  error?: string;
  debug?: Error | unknown;
}

// Big Three Numbers tells you how much you've spent today, this week, and this month.
// https://9to5mac.com/2025/04/14/a-tweet-asked-for-a-simple-finance-app-two-hours-later-it-existed/
export const getBigNumbers = async (): Promise<BigNumbersOutput> => {
  try {
    console.log('get-big-numbers tool called');

    const storedBudgetId = await LocalStorage.getItem<string>('activeBudgetId');
    const activeBudgetId = storedBudgetId?.replace(/["']/g, '');

    if (!activeBudgetId) {
      console.log('No active budget found');
      return {
        success: false,
        today: '0',
        thisWeek: '0',
        thisMonth: '0',
        error: 'No active budget found',
      };
    }

    const storedCurrency = await LocalStorage.getItem<string>('activeBudgetCurrency');
    const activeBudgetCurrency = storedCurrency ? (JSON.parse(storedCurrency) as CurrencyFormat) : null;

    // Get all accounts to filter valid ones
    const accounts = await fetchAccounts(activeBudgetId);
    console.log(`Fetched ${accounts?.length || 0} total accounts`);

    // Format accounts to include only relevant fields and filter out closed accounts
    const validAccounts = (accounts || [])
      .filter((account) => !account.closed && account.on_budget)
      .map((account) => account.id);

    console.log(`Found ${validAccounts.length} valid accounts (non-closed and on-budget)`);

    if (validAccounts.length === 0) {
      return {
        success: false,
        today: '0',
        thisWeek: '0',
        thisMonth: '0',
        error: 'No valid accounts found for the selected budget',
      };
    }

    // Get transactions for the last month
    const transactions = (await fetchTransactions(activeBudgetId, 'month' as Period)) ?? [];
    console.log(`Fetched ${transactions.length} total transactions from the last month`);

    if (transactions.length === 0) {
      console.log('No transactions found');
      return {
        success: true,
        today: '0',
        thisWeek: '0',
        thisMonth: '0',
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Filter transactions to only include non-transfer spending from valid accounts
    const validTransactions = transactions.filter(
      (t) => !t.transfer_account_id && t.amount < 0 && validAccounts.includes(t.account_id),
    );

    console.log(`Found ${validTransactions.length} valid transactions (non-transfer, spending, from valid accounts)`);

    // Calculate spending for each period
    const todaySpending = validTransactions
      .filter((t) => new Date(t.date) >= today)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const weekSpending = validTransactions
      .filter((t) => new Date(t.date) >= weekAgo)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const monthSpending = validTransactions
      .filter((t) => new Date(t.date) >= monthAgo)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Log the results for debugging
    console.log('get-big-numbers tool calculated:', {
      todaySpending,
      weekSpending,
      monthSpending,
      validTransactionsCount: validTransactions.length,
      totalTransactionsCount: transactions.length,
      period: 'month',
      validAccountIds: validAccounts,
    });

    return {
      success: true,
      today: formatToReadableAmount({ amount: todaySpending, currency: activeBudgetCurrency }),
      thisWeek: formatToReadableAmount({ amount: weekSpending, currency: activeBudgetCurrency }),
      thisMonth: formatToReadableAmount({ amount: monthSpending, currency: activeBudgetCurrency }),
    };
  } catch (error) {
    console.error('Error in get-big-numbers tool:', error);
    return {
      success: false,
      today: '0',
      thisWeek: '0',
      thisMonth: '0',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      debug: error,
    };
  }
};

// Add default export
export default getBigNumbers;
