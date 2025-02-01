import { showToast, Toast } from '@raycast/api';
import { leaveMeeting } from '../utils/api';

export default async function Command(): Promise<void> {
  try {
    await leaveMeeting();
    await showToast({
      style: Toast.Style.Success,
      title: 'Left Meeting',
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Failed to Leave Meeting',
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
