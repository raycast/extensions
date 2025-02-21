import { showToast, Toast, confirmAlert } from "@raycast/api";
import { OAuthManager } from "./services/auth/OAuthManager";

export default async function Command() {
  try {
    const shouldSignOut = await confirmAlert({
      title: "Sign Out",
      message: "Are you sure you want to sign out? You'll need to re-authenticate next time you use the extension.",
      primaryAction: {
        title: "Sign Out"
      },
    });

    if (!shouldSignOut) {
      return;
    }

    await OAuthManager.getInstance().clearTokens();
    await showToast({
      style: Toast.Style.Success,
      title: "Signed Out",
      message: "Successfully cleared authentication tokens",
    });
  } catch (error) {
    console.error("Failed to sign out:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Sign Out",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
} 