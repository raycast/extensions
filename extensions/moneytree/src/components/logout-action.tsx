/**
 * Global Logout Action Component
 *
 * Provides a reusable logout action that can be added to any command's ActionPanel.
 * Handles the entire logout flow including confirmation, token/cache clearing, and feedback.
 */

import { Action, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { logout, isAuthenticated } from "../lib/auth";

/**
 * Logout Action Component
 *
 * Add this to any command's ActionPanel to provide logout functionality:
 *
 * @example
 * ```tsx
 * import { LogoutAction } from "./lib/logout-action";
 *
 * <ActionPanel>
 *   <LogoutAction onLogout={() => setData([])} />
 * </ActionPanel>
 * ```
 */
export function LogoutAction({ onLogout }: { onLogout?: () => void }) {
  async function handleLogout() {
    try {
      // Check if user is authenticated first
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Not logged in",
          message: "You're not currently authenticated",
        });
        return;
      }

      // Confirm logout with information on how to fully clear credentials
      const confirmed = await confirmAlert({
        title: "Logout",
        message:
          "Are you sure you want to logout?\n\nℹ️ All financial data will be cleared but your email and password will remain stored in preferences unless you update via settings.",
        primaryAction: {
          title: "Logout",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) {
        return;
      }

      // Show loading toast
      await showToast({
        style: Toast.Style.Animated,
        title: "Logging out...",
        message: "Clearing authentication tokens and cache",
      });

      // Perform logout
      await logout();

      // Call optional callback (for clearing local state in command)
      if (onLogout) {
        onLogout();
      }

      // Show success toast with instruction to clear preferences
      await showToast({
        style: Toast.Style.Success,
        title: "Logged out successfully",
        message: "To fully remove credentials, clear them from extension preferences",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Logout failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Action
      icon={Icon.XMarkCircle}
      title="Logout"
      onAction={handleLogout}
      shortcut={{
        macOS: { modifiers: ["ctrl", "shift"], key: "x" },
        Windows: { modifiers: ["ctrl", "shift"], key: "d" },
      }}
    />
  );
}
