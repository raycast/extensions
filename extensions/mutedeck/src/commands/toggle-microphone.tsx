import { showToast, Toast, confirmAlert, getPreferenceValues, Alert } from '@raycast/api';
import { toggleMute, getStatus, isPresenting } from '../utils/api';

interface Preferences {
  confirmMuteInPresentation: boolean;
  showToasts: boolean;
}

export default function Command(): Promise<void> {
  const { confirmMuteInPresentation, showToasts } = getPreferenceValues<Preferences>();

  return new Promise<void>((resolve, reject) => {
    const handleToggle = async (): Promise<void> => {
      try {
        if (confirmMuteInPresentation) {
          const status = await getStatus();
          if (isPresenting(status)) {
            const proceed = await confirmAlert({
              title: 'Toggle Microphone While Presenting',
              message: 'Are you sure you want to toggle your microphone while presenting?',
              primaryAction: {
                title: 'Toggle Microphone',
                style: Alert.ActionStyle.Destructive,
              },
            });

            if (!proceed) {
              resolve();
              return;
            }
          }
        }

        await toggleMute();

        if (showToasts) {
          await showToast({
            style: Toast.Style.Success,
            title: 'Toggled Microphone',
          });
        }

        resolve();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Failed to Toggle Microphone',
          message: error instanceof Error ? error.message : String(error),
        });
        reject(error);
      }
    };

    void handleToggle();
  });
}
