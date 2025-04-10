import { launchCommand, LaunchType, showToast, Toast } from '@raycast/api';
import { useLocalStorage } from '@raycast/utils';

/**
 * Hook to check for active budget and show a toast if none is found
 * @returns The active budget ID or null if none is found
 */
export function checkForActiveBudget() {
  const { value: activeBudgetId, isLoading } = useLocalStorage('activeBudgetId', '');

  if (!isLoading && !activeBudgetId) {
    showToast({
      style: Toast.Style.Failure,
      title: 'No Active Budget',
      message: 'Please select a budget first by running the "Select Budget" command.',
    });

    launchCommand({
      name: 'activeBudget',
      type: LaunchType.UserInitiated,
    });
  }

  return { activeBudgetId, isLoading };
}
