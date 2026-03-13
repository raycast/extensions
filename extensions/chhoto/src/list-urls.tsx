import {
  List,
  Action,
  ActionPanel,
  showToast,
  Toast,
  getPreferenceValues,
  Clipboard,
  showHUD,
  confirmAlert,
  Icon,
  Alert,
  open,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ofetch } from "ofetch";
import { ExtensionPreferences, UrlItem, DeleteUrlResponse } from "./types";
import { getCachedOrFreshAuthCookie } from "./auth";

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUrls = async () => {
    try {
      setIsLoading(true);

      const authCookie = await getCachedOrFreshAuthCookie(preferences);
      if (!authCookie) {
        showToast({
          title: "Authentication Failed",
          message: "Could not retrieve authentication cookie.",
          style: Toast.Style.Failure,
        });
        setIsLoading(false);
        return;
      }

      const url = new URL("/api/all", preferences["chhoto-host"]);
      const result = await ofetch<UrlItem[]>(url.href, {
        method: "GET",
        headers: {
          Cookie: authCookie,
        },
      });

      setUrls([...result].reverse() || []);
    } catch (error) {
      console.error("Error fetching URLs:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch URLs",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  const copyShortUrl = async (shortlink: string) => {
    try {
      const fullUrl = new URL(shortlink, preferences["chhoto-host"]);
      await Clipboard.copy(fullUrl.href);
      showHUD("Short URL copied to clipboard");
    } catch (error) {
      console.error("Error copying short URL to clipboard:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy to clipboard",
        message: "Could not copy short URL to clipboard",
      });
    }
  };

  const copyLongUrl = async (longlink: string) => {
    try {
      await Clipboard.copy(longlink);
      showHUD("Long URL copied to clipboard");
    } catch (error) {
      console.error("Error copying long URL to clipboard:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy to clipboard",
        message: "Could not copy long URL to clipboard",
      });
    }
  };

  const openUrl = async (shortlink: string) => {
    const fullUrl = new URL(shortlink, preferences["chhoto-host"]);
    await open(fullUrl.href);
  };

  const deleteUrl = async (shortlink: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Short URL",
      message: `Are you sure you want to delete "${shortlink}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      const authCookie = await getCachedOrFreshAuthCookie(preferences);
      if (!authCookie) {
        showToast({
          title: "Authentication Failed",
          message: "Could not retrieve authentication cookie.",
          style: Toast.Style.Failure,
        });
        return;
      }

      const deleteUrl = new URL(
        `/api/del/${shortlink}`,
        preferences["chhoto-host"],
      );
      await ofetch<DeleteUrlResponse>(deleteUrl.href, {
        method: "DELETE",
        headers: {
          Cookie: authCookie,
          "Content-Type": "application/json",
        },
      });

      showToast({
        title: "URL Deleted",
        message: `Short URL "${shortlink}" has been deleted.`,
        style: Toast.Style.Success,
      });

      // Refresh the list to get the updated data
      await fetchUrls();
    } catch (error) {
      console.error("Error deleting URL:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete URL",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const formatExpiry = (expiryTime?: number) => {
    if (!expiryTime) return "Never";
    try {
      const expiryDate = new Date(expiryTime * 1000);
      const now = new Date();
      const diffMillis = expiryDate.getTime() - now.getTime();

      if (diffMillis <= 0) return "Expired";

      const diffSeconds = Math.floor(diffMillis / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30); // Approximate

      if (diffMonths > 0) {
        return `in ${diffMonths} month${diffMonths > 1 ? "s" : ""}`;
      }
      if (diffWeeks > 0) {
        return `in ${diffWeeks} week${diffWeeks > 1 ? "s" : ""}`;
      }
      if (diffDays > 0) {
        return `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
      }
      if (diffHours > 0) {
        return `in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
      }
      if (diffMinutes > 0) {
        return `in ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
      }
      if (diffSeconds > 0) {
        return `in ${diffSeconds} second${diffSeconds > 1 ? "s" : ""}`;
      }
      return "Expires soon";
    } catch {
      return "Invalid date";
    }
  };

  return (
    <List
      navigationTitle="Search URLs"
      searchBarPlaceholder="Search your shortened URLs"
      isLoading={isLoading}
      throttle
    >
      {urls.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No URLs Found"
          description="You haven't shortened any URLs yet!"
        />
      ) : (
        urls.map((urlItem) => (
          <List.Item
            key={urlItem.shortlink}
            title={urlItem.shortlink}
            accessories={
              urlItem.expiry_time
                ? [
                    {
                      text: new URL(urlItem.longlink).hostname,
                      tooltip: `${new URL(urlItem.longlink).hostname}${
                        new URL(urlItem.longlink).pathname
                      }`,
                    },
                    {
                      text: `Expires ${formatExpiry(urlItem.expiry_time)}`,
                    },
                    { text: `${urlItem.hits} hits` },
                  ]
                : [
                    {
                      text: new URL(urlItem.longlink).hostname,
                      tooltip: `${new URL(urlItem.longlink).hostname}${
                        new URL(urlItem.longlink).pathname
                      }`,
                    },
                    { text: `${urlItem.hits} hits` },
                  ]
            }
            actions={
              <ActionPanel>
                <Action
                  title="Copy Short URL"
                  onAction={() => copyShortUrl(urlItem.shortlink)}
                  icon={Icon.Clipboard}
                />
                <Action
                  title="Open URL"
                  onAction={() => openUrl(urlItem.shortlink)}
                  icon={Icon.Globe}
                />
                <Action
                  title="Copy Long URL"
                  onAction={() => copyLongUrl(urlItem.longlink)}
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                />
                <Action
                  title="Delete URL"
                  onAction={() => deleteUrl(urlItem.shortlink)}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
