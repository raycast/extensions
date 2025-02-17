import { Alert, confirmAlert, Icon, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import {
  getPreferences,
  getStatus,
  isInMeeting,
  isMuteDeckRunning,
  leaveMeeting,
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
    const { showToasts, confirmLeave } = getPreferences();

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

    if (confirmLeave) {
      await loadingToast.hide();

      const confirmed = await confirmAlert({
        title: MESSAGES.LEAVE.CONFIRM_TITLE,
        message: MESSAGES.LEAVE.CONFIRM_MESSAGE,
        icon: Icon.XMarkCircle,
        primaryAction: {
          title: "Leave Meeting",
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
        title: "Leaving meeting...",
      });
    } else {
      loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Leaving meeting...",
      });
    }

    await leaveMeeting();

    if (showToasts) {
      await loadingToast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: MESSAGES.LEAVE.SUCCESS,
      });
    }
  } catch (error) {
    console.error("Leave meeting error:", error);
    if (getPreferences().showToasts) {
      await loadingToast?.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: MESSAGES.LEAVE.ERROR,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }
}
