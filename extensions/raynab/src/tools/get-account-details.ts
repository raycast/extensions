import { LocalStorage } from '@raycast/api';
import { fetchAccounts } from '../lib/api';
import { Account } from '../types';

type GetAccountDetailsInput = {
  /**
   * The unique identifier of the account to retrieve
   */
  accountId: string;
};

type GetAccountDetailsOutput = {
  success: boolean;
  account: Account | null;
  error?: string;
};

/**
 * Get detailed information about a specific YNAB account
 * @param input The input parameters containing the account ID
 * @returns Detailed information about the specified account
 */
export default async function (input: GetAccountDetailsInput): Promise<GetAccountDetailsOutput> {
  const storedBudgetId = await LocalStorage.getItem<string>('activeBudgetId');
  const activeBudgetId = storedBudgetId?.replace(/["']/g, '');

  if (!activeBudgetId) {
    return {
      success: false,
      error: 'No active budget found',
      account: null,
    };
  }

  const accounts = await fetchAccounts(activeBudgetId);
  const account = accounts?.find((a) => a.id === input.accountId);

  if (!account) {
    return {
      success: false,
      error: 'Account not found',
      account: null,
    };
  }

  return {
    success: true,
    account,
  };
}
