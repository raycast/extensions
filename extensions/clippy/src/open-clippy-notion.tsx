import { open, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { authorize, clearAuthentication } from "../lib/oauth";
import { API_URL } from "../lib/api-url";

async function fetchUserData(token: string) {
  const response = await fetch(`${API_URL}/api/user/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user data");
  }

  const userData = await response.json();

  return userData;
}

export default async function Command() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Opening Notion...",
    });

    let token = await authorize();

    let userData = await fetchUserData(token);
    let notionDatabaseUrl = userData.user?.notion_database_url;

    // If no Notion database ID, offer to re-authenticate to get fresh data
    if (!notionDatabaseUrl) {
      const shouldReAuth = await confirmAlert({
        title: "Notion Database Not Found",
        message:
          "Your Notion database isn't configured yet. Would you like to re-authenticate to connect your Notion database?",
        primaryAction: {
          title: "Re-authenticate",
          style: Alert.ActionStyle.Default,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      });

      if (!shouldReAuth) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cancelled",
          message: "Please configure your Notion database in Clippy settings",
        });
        return;
      }

      // Clear auth and re-authenticate
      await showToast({
        style: Toast.Style.Animated,
        title: "Re-authenticating...",
      });

      await clearAuthentication();
      token = await authorize();
      userData = await fetchUserData(token);
      notionDatabaseUrl = userData.user?.notion_database_url;

      // Check again after re-auth
      if (!notionDatabaseUrl) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Notion database still not configured",
          message: "Please configure your Notion database in Clippy settings",
        });
        return;
      }
    }

    await open(notionDatabaseUrl);

    await showToast({
      style: Toast.Style.Success,
      title: "Opened in Notion",
    });
  } catch (error) {
    showFailureToast(error, { title: "Failed to open Notion" });
  }
}
