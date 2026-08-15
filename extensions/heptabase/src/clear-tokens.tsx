import { Action, ActionPanel, List, showToast, Toast, confirmAlert, Alert, LocalStorage } from "@raycast/api";
import { useState } from "react";
import { heptabaseOAuthClient, logout } from "./heptabase-oauth";

/**
 * Clear Heptabase OAuth Tokens
 * Clear OAuth tokens and cached data (for debugging)
 */
export default function ClearTokens() {
  const [isCleared, setIsCleared] = useState(false);

  async function handleClearTokens() {
    const confirmed = await confirmAlert({
      title: "Clear all authentication data?",
      message: "This will clear OAuth tokens and client_id. You will need to re-authorize.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Clearing authentication data...",
      });

      // Use logout function to clear all data (including memory cache)
      await logout();

      // Also clear other possible cached data
      const allItems = await LocalStorage.allItems();
      const heptabaseKeys = Object.keys(allItems).filter((key) => key.startsWith("heptabase"));

      for (const key of heptabaseKeys) {
        await LocalStorage.removeItem(key);
      }

      setIsCleared(true);

      await showToast({
        style: Toast.Style.Success,
        title: "All authentication data cleared",
        message: "Re-authorization required next time",
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error clearing tokens:", e);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to clear",
        message: errorMessage,
      });
    }
  }

  async function showCurrentStatus() {
    try {
      const tokenSet = await heptabaseOAuthClient.getTokens();
      const clientId = await LocalStorage.getItem<string>("heptabase_client_id");
      const allItems = await LocalStorage.allItems();
      const heptabaseKeys = Object.keys(allItems).filter((key) => key.startsWith("heptabase"));

      let message = "";

      if (tokenSet?.accessToken) {
        message += "✅ Access Token: Exists\n";
        if (tokenSet.refreshToken) {
          message += "✅ Refresh Token: Exists\n";
        }
        if (tokenSet.isExpired()) {
          message += "⚠️ Token Status: Expired\n";
        } else {
          message += "✅ Token Status: Valid\n";
        }
      } else {
        message += "❌ Access Token: Not found\n";
      }

      if (clientId) {
        message += `✅ Client ID: ${clientId}\n`;
      } else {
        message += "❌ Client ID: Not found\n";
      }

      if (heptabaseKeys.length > 0) {
        message += `\nCached items (${heptabaseKeys.length}):\n`;
        heptabaseKeys.forEach((key) => {
          message += `  - ${key}\n`;
        });
      }

      await confirmAlert({
        title: "Authentication Status",
        message: message,
        primaryAction: {
          title: "OK",
        },
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error checking status:", e);

      await showToast({
        style: Toast.Style.Failure,
        title: "Check failed",
        message: errorMessage,
      });
    }
  }

  return (
    <List>
      <List.EmptyView
        title={isCleared ? "Authentication data cleared" : "Clear Heptabase Authentication Data"}
        description={
          isCleared
            ? "All OAuth tokens and cached data have been cleared. Re-authorization will be required next time you use Heptabase commands."
            : "This command will clear all OAuth tokens and cached data, useful for debugging or re-authorization."
        }
        icon={{ source: isCleared ? "✅" : "🔧" }}
        actions={
          <ActionPanel>
            {!isCleared ? (
              <>
                <Action
                  title="Clear Authentication Data"
                  onAction={handleClearTokens}
                  style={Action.Style.Destructive}
                />
                <Action title="Check Authentication Status" onAction={showCurrentStatus} />
              </>
            ) : (
              <Action title="Check Authentication Status" onAction={showCurrentStatus} />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
