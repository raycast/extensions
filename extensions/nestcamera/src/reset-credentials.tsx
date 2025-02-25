import { showToast, Toast, confirmAlert } from "@raycast/api";
import { OAuthManager } from "./services/auth/OAuthManager";

export default async function Command() {
  try {
    const shouldReset = await confirmAlert({
      title: "Reset OAuth Credentials",
      message:
        "Are you sure you want to reset your Google OAuth credentials? You will need to re-authenticate to use the extension.",
      primaryAction: {
        title: "Reset Credentials",
      },
    });

    if (!shouldReset) {
      return;
    }

    await OAuthManager.getInstance().clearTokens();
    await showToast({
      style: Toast.Style.Success,
      title: "Credentials Reset",
      message: "Your OAuth credentials have been reset. Please restart the extension to re-authenticate.",
    });
  } catch (error) {
    console.error("Failed to reset credentials:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Reset Credentials",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
