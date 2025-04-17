import { LocalStorage } from '@raycast/api';
import { fetchAccounts } from '../lib/api';
import { CurrencyFormat } from '../types';
import { formatToReadableAmount } from '../lib/utils/transactions';

type GetAccountDetailsInput = {
  /**
   * The name of the account to retrieve
   */
  account_name: string;
};

type GetAccountDetailsOutput = {
  success: boolean;
  account?: {
    id: string;
    name: string;
    balance: string;
    type: string;
    on_budget: boolean;
  };
  error?: string;
};

/**
 * Get details of a specific YNAB account
 * @param input The account name to search for
 * @returns Details of the matching account
 */
export default async function (input: GetAccountDetailsInput): Promise<GetAccountDetailsOutput> {
  const storedBudgetId = await LocalStorage.getItem<string>('activeBudgetId');
  const activeBudgetId = storedBudgetId?.replace(/["']/g, '');

  if (!activeBudgetId) {
    return {
      success: false,
      error: 'No active budget found',
    };
  }

  const storedCurrency = await LocalStorage.getItem<string>('activeBudgetCurrency');
  const activeBudgetCurrency = storedCurrency ? (JSON.parse(storedCurrency) as CurrencyFormat) : null;

  const accounts = await fetchAccounts(activeBudgetId);
  const searchQuery = input.account_name.toLowerCase();

  // Find the account by matching the name
  const account =
    (accounts || []).find((acc) => acc.name.toLowerCase() === searchQuery) ||
    (accounts || []).find((acc) => acc.name.toLowerCase().includes(searchQuery));

  if (!account) {
    return {
      success: false,
      error: `No account found matching "${input.account_name}"`,
    };
  }

  const result = {
    success: true,
    account: {
      id: account.id,
      name: account.name,
      balance: formatToReadableAmount({
        amount: account.balance,
        currency: activeBudgetCurrency ?? undefined,
        includeSymbol: true,
      }),
      type: account.type,
      on_budget: account.on_budget,
    },
  };

  return result;
}
