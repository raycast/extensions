import { LocalStorage } from '@raycast/api';
import { fetchAccounts } from '../lib/api';
import { CurrencyFormat } from '../types';
import { formatToReadableAmount } from '../lib/utils/transactions';

type GetAccountsOutput = {
  success: boolean;
  accounts: Array<{
    id: string;
    name: string;
    balance: string;
    type: string;
    on_budget: boolean;
  }>;
  error?: string;
};

/**
 * Get all accounts from YNAB
 * @returns A list of all accounts with formatted data
 */
export default async function (): Promise<GetAccountsOutput> {
  const storedBudgetId = await LocalStorage.getItem<string>('activeBudgetId');
  const activeBudgetId = storedBudgetId?.replace(/["']/g, '');

  if (!activeBudgetId) {
    return {
      success: false,
      error: 'No active budget found',
      accounts: [],
    };
  }

  const storedCurrency = await LocalStorage.getItem<string>('activeBudgetCurrency');
  const activeBudgetCurrency = storedCurrency ? (JSON.parse(storedCurrency) as CurrencyFormat) : null;

  const accounts = await fetchAccounts(activeBudgetId);

  // Format accounts to include only relevant fields and filter out closed accounts
  const formattedAccounts = (accounts ?? [])
    .filter((account) => !account.closed)
    .map((account) => ({
      id: account.id,
      name: account.name,
      balance: formatToReadableAmount({
        amount: account.balance,
        currency: activeBudgetCurrency ?? undefined,
        includeSymbol: true,
      }),
      type: account.type,
      on_budget: account.on_budget,
    }));

  const result = {
    success: true,
    accounts: formattedAccounts,
  };

  return result;
}
