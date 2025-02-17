import { Alert, confirmAlert, Icon, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import {
  getPreferences,
  getStatus,
  isInMeeting,
  isMuted,
  isMuteDeckRunning,
  isPresenting,
  toggleMute,
  type MuteDeckStatus,
} from "./utils/api";
import { MESSAGES, TROUBLESHOOTING_STEPS } from "./utils/constants";

export default async function Command(): Promise<void> {
  await updateCommandMetadata({ subtitle: null });
  let loadingToast: Toast | undefined;

  try {
    loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Checking MuteDeck status...",
    });

    const status: MuteDeckStatus = await getStatus();
    const { showToasts, confirmMuteInPresentation } = getPreferences();

    if (!isMuteDeckRunning(status)) {
      if (showToasts) {
        await loadingToast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: MESSAGES.STATUS.NOT_RUNNING,
          message: TROUBLESHOOTING_STEPS,
        });
      }
      return;
    }

    if (!isInMeeting(status)) {
      if (showToasts) {
        await loadingToast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: MESSAGES.STATUS.NO_MEETING,
          message: "You are not currently in a meeting.",
        });
      }
      return;
    }

    if (confirmMuteInPresentation && isPresenting(status)) {
      await loadingToast.hide();

      const confirmed = await confirmAlert({
        title: MESSAGES.MUTE.CONFIRM_TITLE,
        message: MESSAGES.MUTE.CONFIRM_MESSAGE,
        icon: Icon.Microphone,
        primaryAction: {
          title: "Toggle Microphone",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (!confirmed) {
        return;
      }

      loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Toggling microphone...",
      });
    } else {
      loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Toggling microphone...",
      });
    }

    await toggleMute();
    const newStatus: MuteDeckStatus = await getStatus();

    if (showToasts) {
      await loadingToast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: isMuted(newStatus) ? "Microphone Muted" : "Microphone Unmuted",
      });
    }
  } catch (error) {
    console.error("Toggle microphone error:", error);
    if (getPreferences().showToasts) {
      await loadingToast?.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: MESSAGES.MUTE.ERROR,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }
}
