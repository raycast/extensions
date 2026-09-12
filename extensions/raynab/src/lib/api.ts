import { captureException, getPreferenceValues, showToast, Toast } from '@raycast/api';
import * as ynab from 'ynab';
import { displayError, isYnabError } from './errors';
import type { Period, BudgetSummary, SaveTransaction, NewTransaction } from '@srcTypes';
import { time } from './utils';
import { SaveScheduledTransaction } from 'ynab';

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
    captureException(error);
    if (isYnabError(error)) {
      const { title, message } = displayError(error, 'Failed to fetch budgets');
      await showToast({
        style: Toast.Style.Failure,
        title,
        message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Something went wrong',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export async function fetchBudget(selectedBudgetId: string) {
  try {
    const budgetResponse = await client.budgets.getBudgetById(selectedBudgetId);
    const { months, currency_format } = budgetResponse.data.budget;

    return { months, currency_format };
  } catch (error) {
    captureException(error);

    if (isYnabError(error)) {
      const { title, message } = displayError(error, 'Failed to fetch budget');
      await showToast({
        style: Toast.Style.Failure,
        title,
        message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Something went wrong',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export async function fetchCategoryGroups(selectedBudgetId: string) {
  try {
    const categoriesResponse = await client.categories.getCategories(selectedBudgetId);
    const categoryGroups = categoriesResponse.data.category_groups;
    return categoryGroups;
  } catch (error) {
    captureException(error);

    if (isYnabError(error)) {
      const { title, message } = displayError(error, 'Failed to fetch categories');
      await showToast({
        style: Toast.Style.Failure,
        title,
        message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Something went wrong',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export async function fetchPayees(selectedBudgetId: string) {
  try {
    const payeesResponse = await client.payees.getPayees(selectedBudgetId);
    const payees = payeesResponse.data.payees;
    return payees;
  } catch (error) {
    captureException(error);

    if (isYnabError(error)) {
      const { title, message } = displayError(error, 'Failed to fetch payees');
      await showToast({
        style: Toast.Style.Failure,
        title,
        message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Something went wrong',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export async function fetchAccounts(selectedBudgetId: string) {
  try {
    const accountsResponse = await client.accounts.getAccounts(selectedBudgetId || 'last-used');
    const accounts = accountsResponse.data.accounts;

    return accounts;
  } catch (error) {
    captureException(error);

    if (isYnabError(error)) {
      const { title, message } = displayError(error, 'Failed to fetch accounts');
      await showToast({
        style: Toast.Style.Failure,
        title,
        message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Something went wrong',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export async function fetchTransactions(selectedBudgetId: string, period: Period) {
  try {
    const transactionsResponse = await client.transactions.getTransactions(
      selectedBudgetId,
      time()
        .subtract(1, period as time.ManipulateType)
        .toISOString(),
    );
    const transactions = transactionsResponse.data.transactions;

    // Sorted by oldest
    transactions.reverse();

    return transactions;
  } catch (error) {
    captureException(error);

    if (isYnabError(error)) {
      const { title, message } = displayError(error, 'Failed to fetch transactions');
      await showToast({
        style: Toast.Style.Failure,
        title,
        message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Something went wrong',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export async function fetchScheduledTransactions(selectedBudgetId: string) {
  try {
    const scheduledTransactionsResponse = await client.scheduledTransactions.getScheduledTransactions(selectedBudgetId);
    const transactions = scheduledTransactionsResponse.data.scheduled_transactions;

    return transactions;
  } catch (error) {
    captureException(error);

    if (isYnabError(error)) {
      const { title, message } = displayError(error, 'Failed to fetch scheduled transactions');
      await showToast({
        style: Toast.Style.Failure,
        title,
        message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Something went wrong',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export async function updateTransaction(selectedBudgetId: string, transactionId: string, data: SaveTransaction) {
  try {
    const updateResponse = await client.transactions.updateTransaction(selectedBudgetId || 'last-used', transactionId, {
      transaction: data,
    });
    const { transaction: updatedTransaction } = updateResponse.data;
    return updatedTransaction;
  } catch (error) {
    captureException(error);

    if (isYnabError(error)) {
      const { message } = displayError(error, 'Failed to update transaction');
      throw new Error(message);
    } else {
      throw error;
    }
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
    captureException(error);

    if (isYnabError(error)) {
      const { message } = displayError(error, 'Failed to create transaction');
      throw new Error(message);
    } else {
      throw error;
    }
  }
}

export async function deleteTransaction(selectedBudgetId: string, transactionId: string) {
  try {
    const updateResponse = await client.transactions.deleteTransaction(selectedBudgetId || 'last-used', transactionId);

    const { transaction: deletedTransaction } = updateResponse.data;
    return deletedTransaction;
  } catch (error) {
    captureException(error);

    if (isYnabError(error)) {
      const { message } = displayError(error, 'Failed to delete transaction');
      throw new Error(message);
    } else {
      throw error;
    }
  }
}

export async function createScheduledTransaction(selectedBudgetId: string, transactionData: SaveScheduledTransaction) {
  try {
    const transactionCreationResponse = await client.scheduledTransactions.createScheduledTransaction(
      selectedBudgetId || 'last-used',
      {
        scheduled_transaction: transactionData,
      },
    );

    const createdTransaction = transactionCreationResponse.data.scheduled_transaction;

    return createdTransaction;
  } catch (error) {
    captureException(error);

    if (isYnabError(error)) {
      const { message } = displayError(error, 'Failed to create scheduled transaction');
      throw new Error(message);
    } else {
      throw error;
    }
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
      },
    );
    const updatedCategory = updateResponse.data;
    return updatedCategory;
  } catch (error) {
    captureException(error);

    if (isYnabError(error)) {
      const { message } = displayError(error, 'Failed to update category');
      throw new Error(message);
    } else {
      throw error;
    }
  }
}
