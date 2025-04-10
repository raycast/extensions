import { Action, Tool, LocalStorage } from '@raycast/api';
import { launchCommand, LaunchType } from '@raycast/api';
import { fetchAccounts, fetchBudgets } from '@lib/api';
import { showToast, Toast } from '@raycast/api';
import { Account, CurrencyFormat } from '@srcTypes';
import { formatToReadableAmount } from '@lib/utils';

/**
 * Input type for creating a new transaction
 */
type TransactionInput = {
  /**
   * Optional date for the transaction (ISO format)
   */
  date?: string;
  /**
   * The name of the payee
   */
  payee_name: string;
  /**
   * The amount of the transaction (positive for income, negative for expense) with a currency symbol
   */
  amount: number;
  /**
   * Optional date name of the account to create the transaction in
   */
  account_name?: string;
  /**
   * Optional memo for the transaction
   */
  memo?: string;
};

/**
 * Helper function to find a valid account by name or ID
 */
function findAccount(accounts: Account[], accountName?: string, accountId?: string): Account | undefined {
  if (!accountName && !accountId) {
    throw new Error('Either account_name or account_id must be provided');
  }

  // First try to find by ID if provided
  if (accountId) {
    const account = accounts.find((acc) => acc.id === accountId);
    if (account) {
      console.log('Found account by ID:', account);
      return account;
    }
  }

  // Then try to find by name if provided
  if (accountName) {
    const inputNameLower = accountName.toLowerCase().trim();
    const account = accounts.find((acc) => acc.name.toLowerCase().trim().includes(inputNameLower));
    if (account) {
      console.log('Found account by name:', account);
      return account;
    }
  }

  // If we get here, no account was found
  const availableAccounts = accounts.map((acc) => acc.name).join(', ');
  throw new Error(`Account not found. Available accounts: ${availableAccounts}`);
}

/**
 * Helper function to format transaction data for the form
 */
function formatTransactionData(account: Account, input: TransactionInput) {
  if (!account || !account.id) {
    throw new Error('Invalid account provided');
  }

  if (typeof input.amount !== 'number' || isNaN(input.amount)) {
    throw new Error('Amount must be a valid number');
  }

  if (!input.payee_name || typeof input.payee_name !== 'string') {
    throw new Error('Payee name must be a non-empty string');
  }

  let date = input.date;
  if (date) {
    try {
      // Validate date format
      new Date(date);
    } catch (e) {
      throw new Error('Invalid date format. Please use YYYY-MM-DD format');
    }
  } else {
    date = new Date().toISOString().split('T')[0];
  }

  // Ensure amount is positive - the form will handle the sign
  const amount = Math.abs(input.amount);

  return {
    account_id: account.id,
    amount: amount,
    payee_name: input.payee_name,
    memo: input.memo || '',
    date: date,
  };
}

export const confirmation: Tool.Confirmation<TransactionInput> = async (input) => {
  // Get the active budget currency
  const storedBudgetId = await LocalStorage.getItem<string>('activeBudgetId');
  const activeBudgetId = storedBudgetId?.replace(/["']/g, '');
  if (!activeBudgetId) {
    throw new Error('No active budget found');
  }

  const storedCurrency = await LocalStorage.getItem<string>('activeBudgetCurrency');
  const activeBudgetCurrency = storedCurrency ? (JSON.parse(storedCurrency) as CurrencyFormat) : null;

  // Format the amount with currency, using absolute value
  const formattedAmount = formatToReadableAmount({
    amount: Math.abs(input.amount) * 1000, // Convert to milliunits for YNAB and make positive
    currency: activeBudgetCurrency ?? undefined,
    includeSymbol: true,
  });

  return {
    style: Action.Style.Regular,
    message: `Are you sure you want to create a transaction for ${input.payee_name} with amount ${formattedAmount}?`,
    info: [
      { name: 'Payee', value: input.payee_name },
      { name: 'Amount', value: formattedAmount },
      { name: 'Account', value: input.account_name || '' },
      { name: 'Memo', value: input.memo || '' },
      { name: 'Date', value: input.date || new Date().toISOString().split('T')[0] },
    ],
  };
};

export default async function (input: TransactionInput) {
  try {
    const storedBudgetId = await LocalStorage.getItem<string>('activeBudgetId');
    const activeBudgetId = storedBudgetId?.replace(/["']/g, '');
    if (!activeBudgetId)
      return {
        success: false,
        error: 'No active budget found',
        debug: { activeBudgetId: null },
      };

    const accounts = await fetchAccounts(activeBudgetId);
    if (!accounts || accounts.length === 0) {
      console.log('No accounts found for budget');
      throw new Error('No accounts found for the selected budget');
    }

    console.log('Finding account with name:', input.account_name);
    const account = findAccount(accounts, input.account_name);
    if (!account) {
      console.log('Account not found');
      const validAccounts = accounts
        .filter((acc) => !acc.closed && !acc.deleted && acc.on_budget)
        .map((acc) => acc.name);

      throw new Error(`Account not found. Available accounts: ${validAccounts.join(', ')}`);
    }

    console.log('Found account:', account);
    const transaction = formatTransactionData(account, input);
    console.log('Formatted transaction:', transaction);

    await launchCommand({
      name: 'transaction',
      type: LaunchType.UserInitiated,
      context: {
        transaction: transaction,
      },
    });

    console.log('Transaction form launched successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in add-transaction tool:', error);
    await showToast({
      style: Toast.Style.Failure,
      title: 'Failed to Create Transaction',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      debug: {
        input,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      },
    };
  }
}
