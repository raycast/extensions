import { authorize, getApiKey, isAuthenticated as checkAuth, secureLogout } from "../auth";
import { showToast, Toast, environment, LaunchType } from "@raycast/api";

export async function initiateAuthFlow(): Promise<string | null> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Logging in to Clipmate",
    });

    const apiKey = await authorize();

    await showToast({
      style: Toast.Style.Success,
      title: "Successfully logged in to Clipmate",
    });

    return apiKey;
  } catch (error) {
    console.error("Authentication error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Oops! That didn't work",
      message: "Please try again",
    });
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return checkAuth();
}

export async function getToken(): Promise<string | null> {
  return getApiKey();
}

export async function signOut(): Promise<void> {
  try {
    await secureLogout();
    await showToast({
      style: Toast.Style.Success,
      title: "Successfully logged out",
    });
    // Force re-authentication on next access
    environment.launchType = LaunchType.Background;
  } catch (error) {
    console.error("Logout error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to log out",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
