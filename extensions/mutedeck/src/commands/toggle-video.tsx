import { showToast, Toast } from '@raycast/api';
import { toggleVideo } from '../utils/api';

export default async function Command(): Promise<void> {
  try {
    await toggleVideo();
    await showToast({
      style: Toast.Style.Success,
      title: 'Toggled Video',
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Failed to Toggle Video',
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
