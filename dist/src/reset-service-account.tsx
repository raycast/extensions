import { confirmAlert, showToast, Toast, Alert } from "@raycast/api";
import { resetServiceAccount } from "./utils/firebase";

export default async function Command() {
  try {
    const confirmed = await confirmAlert({
      title: "Reset Firebase Service Account",
      message: "Are you sure you want to reset your Firebase service account configuration? You will need to set it up again to use the extension.",
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await resetServiceAccount();

    await showToast({
      style: Toast.Style.Success,
      title: "Service Account Reset",
      message: "Your Firebase service account configuration has been reset.",
    });
  } catch (error) {
    console.error("Error resetting service account:", error);
    
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Reset Service Account",
      message: "An error occurred while resetting your service account configuration.",
    });
  }
} 