import { Alert, confirmAlert, Icon, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import {
  getPreferences,
  getStatus,
  isInMeeting,
  isMuted,
  isMuteDeckRunning,
  isPresenting,
  toggleMute,
} from "./utils/api";

export default async function Command(): Promise<void> {
  // Clear any existing subtitle
  await updateCommandMetadata({ subtitle: null });

  let loadingToast: Toast | undefined;

  try {
    // Show initial loading state
    loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Checking MuteDeck status...",
    });

    const status = await getStatus();
    const { showToasts, confirmMuteInPresentation } = getPreferences();

    if (!isMuteDeckRunning(status)) {
      if (showToasts) {
        await loadingToast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: "MuteDeck Not Running",
          message:
            "Please start MuteDeck and try again.\n\nTroubleshooting:\n1. Check if MuteDeck is installed\n2. Launch MuteDeck from your Applications\n3. Wait a few seconds and try again",
        });
      }
      return;
    }

    if (!isInMeeting(status)) {
      if (showToasts) {
        await loadingToast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: "Not in Meeting",
          message: "You are not currently in a meeting.",
        });
      }
      return;
    }

    // Check if confirmation is needed when presenting
    if (confirmMuteInPresentation && isPresenting(status)) {
      await loadingToast.hide();

      const confirmed = await confirmAlert({
        title: "Toggle Microphone",
        message: "Are you sure you want to toggle your microphone while presenting?",
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

      // Show new loading state after confirmation
      loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Toggling microphone...",
      });
    } else {
      // Update loading state
      loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Toggling microphone...",
      });
    }

    await toggleMute();

    // Get the new status after toggling
    const newStatus = await getStatus();

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
        title: "Failed to Toggle Microphone",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }
}
