import { showToast, Toast, LocalStorage } from '@raycast/api';
import { useLocalStorage } from '@raycast/utils';

/**
 * Hook to check for active budget and show a toast if none is found
 * @returns The active budget ID or null if none is found
 */
export function useActiveBudget() {
  const { value: activeBudgetId, isLoading } = useLocalStorage('activeBudgetId', '');

  if (!isLoading && !activeBudgetId) {
    showToast({
      style: Toast.Style.Failure,
      title: 'No Active Budget',
      message: 'Please select a budget first by running the "Select Budget" command.',
    });
  }

  return { activeBudgetId, isLoading };
}

/**
 * Function to check for active budget and show a toast if none is found
 * @returns The active budget ID or null if none is found
 */
export async function checkForActiveBudget() {
  const storedBudgetId = await LocalStorage.getItem<string>('activeBudgetId');
  const activeBudgetId = storedBudgetId?.replace(/["']/g, '');

  if (!activeBudgetId) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'No Active Budget',
      message: 'Please select a budget first by running the "Select Budget" command.',
    });
  }

  return activeBudgetId;
}
