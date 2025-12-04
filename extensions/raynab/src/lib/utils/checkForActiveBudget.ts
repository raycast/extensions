import { launchCommand, LaunchType } from '@raycast/api';
import { useLocalStorage, showFailureToast } from '@raycast/utils';

/**
 * Hook to check for active budget and show a toast if none is found
 * @returns The active budget ID or null if none is found
 */
export function checkForActiveBudget() {
  const { value: activeBudgetId, isLoading } = useLocalStorage('activeBudgetId', '');

  if (!isLoading && !activeBudgetId) {
    showFailureToast('No Active Budget', {
      message: 'Please select a budget first by running the "Select Budget" command.',
    });

    launchCommand({
      name: 'activeBudget',
      type: LaunchType.UserInitiated,
    }).catch((error) => {
      showFailureToast(error, { title: 'Failed to launch budget selection' });
    });
  }

  return { activeBudgetId, isLoading };
}
