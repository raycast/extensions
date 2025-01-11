import { showToast, Toast, confirmAlert, Alert, Icon } from '@raycast/api';
import {
  getStatus,
  leaveMeeting,
  isMuteDeckRunning,
  isInMeeting,
  getPreferences,
} from './utils/api';

export default async function Command(): Promise<void> {
  let loadingToast: Toast | undefined;

  try {
    // Show initial loading state
    loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: 'Checking MuteDeck status...',
    });

    const status = await getStatus();
    const { showToasts } = getPreferences();

    if (!isMuteDeckRunning(status)) {
      if (showToasts) {
        await loadingToast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: 'MuteDeck Not Running',
          message:
            'Please start MuteDeck and try again.\n\nTroubleshooting:\n1. Check if MuteDeck is installed\n2. Launch MuteDeck from your Applications\n3. Wait a few seconds and try again',
        });
      }
      return;
    }

    if (!isInMeeting(status)) {
      if (showToasts) {
        await loadingToast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: 'Not in Meeting',
          message: 'You are not currently in a meeting.',
        });
      }
      return;
    }

    // Check if confirmation is needed
    const confirmed = await confirmAlert({
      title: 'Leave Meeting',
      message: 'Are you sure you want to leave the current meeting?',
      icon: Icon.ArrowRightCircle,
      primaryAction: {
        title: 'Leave Meeting',
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: 'Cancel',
      },
    });

    if (!confirmed) {
      return;
    }

    // Show new loading state after confirmation
    loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: 'Leaving meeting...',
    });

    await leaveMeeting();

    if (showToasts) {
      await loadingToast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: 'Left Meeting',
      });
    }
  } catch (error) {
    console.error('Leave meeting error:', error);
    if (getPreferences().showToasts) {
      await loadingToast?.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to Leave Meeting',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
}
