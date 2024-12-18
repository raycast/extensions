import { getPreferenceValues, showToast, Toast } from '@raycast/api';
import * as ynab from 'ynab';
import { displayError, isYnabError } from './errors';
import type { Period, BudgetSummary, SaveTransaction, NewTransaction, Preferences } from '@srcTypes';
import { time } from './utils';

const { apiToken } = getPreferenceValues<Preferences>();
const client = new ynab.API(apiToken);

export async function fetchBudgets() {
  try {
    const budgetsResponse = await client.budgets.getBudgets();
    const budgets = budgetsResponse.data.budgets;

    const allBudgets: BudgetSummary[] = budgets.map(({ id, name, last_modified_on, currency_format }) => {
      return { id, name, last_modified_on, currency_format };
    });

    return allBudgets;
  } catch (error) {
    console.error(error);

    if (isYnabError(error)) {
      displayError(error, 'Failed to fetch budgets');
    }

    if (error instanceof Error) {
      showToast({ style: Toast.Style.Failure, title: 'Something went wrong', message: error.message });
    }

    throw error;
  }
}

export async function fetchBudget(selectedBudgetId: string) {
  try {
    const budgetResponse = await client.budgets.getBudgetById(selectedBudgetId);
    const { months, currency_format } = budgetResponse.data.budget;

    return { months, currency_format };
  } catch (error) {
    console.error(error);

    if (isYnabError(error)) {
      displayError(error, 'Failed to fetch budget');
    }

    if (error instanceof Error) {
      showToast({ style: Toast.Style.Failure, title: 'Something went wrong', message: error.message });
    }

    throw error;
  }
}

export async function fetchCategoryGroups(selectedBudgetId: string) {
  try {
    const categoriesResponse = await client.categories.getCategories(selectedBudgetId);
    const categoryGroups = categoriesResponse.data.category_groups;
    return categoryGroups;
  } catch (error) {
    console.error(error);

    if (isYnabError(error)) {
      displayError(error, 'Failed to fetch categories');
    }

    if (error instanceof Error) {
      showToast({ style: Toast.Style.Failure, title: 'Something went wrong', message: error.message });
    }

    throw error;
  }
}

export async function fetchPayees(selectedBudgetId: string) {
  try {
    const payeesResponse = await client.payees.getPayees(selectedBudgetId);
    const payees = payeesResponse.data.payees;
    return payees;
  } catch (error) {
    console.error(error);

    if (isYnabError(error)) {
      displayError(error, 'Failed to fetch payees');
    }

    if (error instanceof Error) {
      showToast({ style: Toast.Style.Failure, title: 'Something went wrong', message: error.message });
    }

    throw error;
  }
}

export async function fetchAccounts(selectedBudgetId: string) {
  try {
    const accountsResponse = await client.accounts.getAccounts(selectedBudgetId || 'last-used');
    const accounts = accountsResponse.data.accounts;

    return accounts;
  } catch (error) {
    console.error(error);

    if (isYnabError(error)) {
      displayError(error, 'Failed to fetch accounts');
    }

    if (error instanceof Error) {
      showToast({ style: Toast.Style.Failure, title: 'Something went wrong', message: error.message });
    }

    throw error;
  }
}

export async function fetchTransactions(selectedBudgetId: string, period: Period) {
  try {
    const transactionsResponse = await client.transactions.getTransactions(
      selectedBudgetId,
      time()
        .subtract(1, period as time.ManipulateType)
        .toISOString()
    );
    const transactions = transactionsResponse.data.transactions;

    // Sorted by oldest
    transactions.reverse();

    return transactions;
  } catch (error) {
    console.error(error);

    if (isYnabError(error)) {
      displayError(error, 'Failed to fetch transactions');
    }

    if (error instanceof Error) {
      showToast({ style: Toast.Style.Failure, title: 'Something went wrong', message: error.message });
    }

    throw error;
  }
}

export async function updateTransaction(selectedBudgetId: string, transactionId: string, data: SaveTransaction) {
  try {
    const updateResponse = await client.transactions.updateTransaction(selectedBudgetId || 'last-used', transactionId, {
      transaction: data,
    });
    const updatedTransaction = updateResponse.data;
    return updatedTransaction;
  } catch (error) {
    console.error(error);

    if (isYnabError(error)) {
      displayError(error, 'Failed to fetch update transaction');
    }

    if (error instanceof Error) {
      showToast({ style: Toast.Style.Failure, title: 'Something went wrong', message: error.message });
    }

    throw error;
  }
}

export async function createTransaction(selectedBudgetId: string, transactionData: NewTransaction) {
  try {
    const transactionCreationResponse = await client.transactions.createTransaction(selectedBudgetId || 'last-used', {
      transaction: transactionData,
    });

    if (transactionCreationResponse.data.duplicate_import_ids) throw `Transcation already exists`;

    const createdTransaction = transactionCreationResponse.data.transaction;

    return createdTransaction;
  } catch (error) {
    console.error(error);

    if (isYnabError(error)) {
      displayError(error, 'Failed to fetch update transaction');
    }

    if (error instanceof Error) {
      showToast({ style: Toast.Style.Failure, title: 'Something went wrong', message: error.message });
    }

    throw error;
  }
}

export async function updateCategory(selectedBudgetId: string, categoryId: string, data: { budgeted: number }) {
  try {
    const updateResponse = await client.categories.updateMonthCategory(
      selectedBudgetId || 'last-used',
      'current',
      categoryId,
      {
        category: data,
      }
    );
    const updatedCategory = updateResponse.data;
    return updatedCategory;
  } catch (error) {
    console.error(error);

    if (isYnabError(error)) {
      displayError(error, 'Failed to fetch update transaction');
    }

    if (error instanceof Error) {
      showToast({ style: Toast.Style.Failure, title: 'Something went wrong', message: error.message });
    }

    throw error;
  }
}
