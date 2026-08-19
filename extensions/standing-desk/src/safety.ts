import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import {
  acknowledgeSafety,
  getDeskSelection,
  hasAcknowledgedSafety,
} from "./storage";

export async function ensureSafetyAcknowledgement(): Promise<boolean> {
  const selection = await getDeskSelection();
  if (!selection) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Select a desk first",
      message: "Open Desk Settings and choose the physical desk to control.",
    });
    return false;
  }
  if (await hasAcknowledgedSafety(selection.token)) {
    return true;
  }

  const confirmed = await confirmAlert({
    title: "Move the physical desk?",
    message:
      "Watch the desk while it moves. Keep people, furniture, cables, and objects clear. Be ready to use the physical control.",
    primaryAction: {
      title: "I Understand",
    },
    dismissAction: {
      title: "Cancel",
      style: Alert.ActionStyle.Cancel,
    },
  });

  if (confirmed) {
    try {
      await acknowledgeSafety(selection.token);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Selected desk changed",
        message: "Review the safety notice again before moving the desk.",
      });
      return false;
    }
  }
  return confirmed;
}
