import { Alert, confirmAlert, Icon, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import {
  getPreferences,
  getStatus,
  isInMeeting,
  isMuteDeckRunning,
  isPresenting,
  isVideoOn,
  toggleVideo,
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
    const { showToasts, confirmVideoInPresentation } = getPreferences();

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

    if (confirmVideoInPresentation && isPresenting(status)) {
      await loadingToast.hide();

      const confirmed = await confirmAlert({
        title: MESSAGES.VIDEO.CONFIRM_TITLE,
        message: MESSAGES.VIDEO.CONFIRM_MESSAGE,
        icon: Icon.Video,
        primaryAction: {
          title: "Toggle Video",
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
        title: "Toggling video...",
      });
    } else {
      loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Toggling video...",
      });
    }

    await toggleVideo();
    const newStatus: MuteDeckStatus = await getStatus();

    if (showToasts) {
      await loadingToast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: isVideoOn(newStatus) ? "Video On" : "Video Off",
      });
    }
  } catch (error) {
    console.error("Toggle video error:", error);
    if (getPreferences().showToasts) {
      await loadingToast?.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: MESSAGES.VIDEO.ERROR,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }
}
