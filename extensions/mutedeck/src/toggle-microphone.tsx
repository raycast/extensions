import { Alert, confirmAlert, Icon, showHUD } from "@raycast/api";
import { getPreferences, isPresenting, isRecording, toggleMute } from "./utils/api";
import { MESSAGES, TROUBLESHOOTING_STEPS } from "./utils/constants";
import { showErrorToast, showSuccessToast } from "./utils/notifications";

export default async function Command(): Promise<void> {
  try {
    const { confirmMuteInPresentation } = getPreferences();

    if (confirmMuteInPresentation) {
      const presenting = await isPresenting();
      const recording = await isRecording();

      if (presenting || recording) {
        if (
          !(await confirmAlert({
            title: MESSAGES.MUTE.CONFIRM_TITLE,
            message: MESSAGES.MUTE.CONFIRM_MESSAGE,
            icon: Icon.ExclamationMark,
            primaryAction: {
              title: "Toggle Microphone",
              style: Alert.Style.Default,
            },
          }))
        ) {
          return;
        }
      }
    }

    await toggleMute();
    await showSuccessToast(MESSAGES.MUTE.SUCCESS);
  } catch (error) {
    if (error instanceof Error) {
      await showErrorToast(MESSAGES.MUTE.ERROR, error);
      await showHUD(TROUBLESHOOTING_STEPS);
    }
  }
}
