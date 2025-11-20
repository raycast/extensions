import { showToast, Toast, popToRoot } from "@raycast/api";
import { logout, isAuthenticated } from "./lib/auth";

export default async function Command() {
  try {
    console.debug("[Logout] Starting logout process");

    // Check if user is authenticated
    console.debug("[Logout] Checking authentication status...");
    const authenticated = await isAuthenticated();
    console.debug(`[Logout] Authentication status: ${authenticated}`);

    if (!authenticated) {
      console.debug("[Logout] User is not authenticated, showing error");
      await showToast({
        style: Toast.Style.Failure,
        title: "Not logged in",
        message: "You're not currently logged in to Moneytree",
      });
      await popToRoot();
      return;
    }

    // Show loading toast
    console.debug("[Logout] User is authenticated, proceeding with logout");
    await showToast({
      style: Toast.Style.Animated,
      title: "Logging out...",
      message: "Clearing authentication tokens",
    });

    // Perform logout
    console.debug("[Logout] Calling logout() function");
    await logout();
    console.debug("[Logout] logout() completed");

    // Verify logout was successful
    console.debug("[Logout] Verifying logout was successful...");
    const stillAuthenticated = await isAuthenticated();
    console.debug(`[Logout] Post-logout authentication status: ${stillAuthenticated}`);

    if (stillAuthenticated) {
      console.debug("[Logout] ERROR: Tokens still exist after logout");
      throw new Error("Tokens were not cleared properly");
    }

    // Show success toast
    console.debug("[Logout] Logout successful, showing success message");
    await showToast({
      style: Toast.Style.Success,
      title: "Logged out",
      message: "You have been successfully logged out from Moneytree",
    });

    await popToRoot();
  } catch (error) {
    console.debug(`[Logout] Logout failed with error: ${error}`);
    await showToast({
      style: Toast.Style.Failure,
      title: "Logout failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    await popToRoot();
  }
}
