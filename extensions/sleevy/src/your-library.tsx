import {
  ActionPanel,
  Action,
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  open,
  Clipboard,
} from "@raycast/api";
import {
  getAccessToken,
  getFavicon,
  useFetch,
  withAccessToken,
} from "@raycast/utils";
import { useState } from "react";

import { authorize, deriveWebUrl, oauthClient } from "./oauth";
import { getSleevyPreferences } from "./preferences";
import type { SavedItemDto, SavedItemsResponse } from "./contract";

type SavedItem = SavedItemDto;

function getTypeIcon(type?: SavedItem["type"]): Icon {
  switch (type) {
    case "article":
      return Icon.Document;
    case "video":
      return Icon.Play;
    case "repository":
      return Icon.Code;
    case "website":
      return Icon.Globe;
    default:
      return Icon.Link;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const minutes = Math.floor(diffInHours * 60);
    return minutes < 1 ? "Just now" : `${minutes}m ago`;
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours}h ago`;
  } else if (diffInHours < 48) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString();
  }
}

function YourLibrary() {
  const preferences = getSleevyPreferences();
  const webUrl = preferences.webUrl ?? deriveWebUrl(preferences.apiUrl);
  const { token } = getAccessToken();
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const { isLoading, data, error, revalidate } = useFetch<SavedItemsResponse>(
    `${preferences.apiUrl}/v1/saved-items`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      async parseResponse(response) {
        if (response.status === 401) {
          await oauthClient.removeTokens();
          throw new Error("Unauthorized. Run the command again to reconnect.");
        }
        if (!response.ok) {
          throw new Error(`Request failed (HTTP ${response.status})`);
        }
        return (await response.json()) as SavedItemsResponse;
      },
      async onError(error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch saved items",
          message: error.message,
        });
      },
    },
  );

  if (error) {
    return (
      <List>
        <List.Item
          icon={Icon.ExclamationMark}
          title="Error loading saved items"
          subtitle={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const savedItems = data?.savedItems ?? [];

  async function handleOpen(item: SavedItem) {
    await open(item.originalUrl);
    try {
      await fetch(`${preferences.apiUrl}/v1/saved-items/${item.id}/open`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      revalidate();
    } catch (error) {
      console.error("Failed to mark as opened:", error);
    }
  }

  async function handleDelete(item: SavedItem) {
    const confirmed = await confirmAlert({
      title: "Delete Saved Item",
      message: `Are you sure you want to delete "${item.title ?? item.originalUrl}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Deleting..." });
      const response = await fetch(
        `${preferences.apiUrl}/v1/saved-items/${item.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (response.ok) {
        await showToast({
          style: Toast.Style.Success,
          title: "Deleted successfully",
        });
        revalidate();
      } else if (response.status === 401) {
        await oauthClient.removeTokens();
        throw new Error("Unauthorized. Run the command again to reconnect.");
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete",
        message: String(error),
      });
    }
  }

  async function handleToggleRead(item: SavedItem) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: item.isRead ? "Marking as unread..." : "Marking as read...",
      });
      const response = await fetch(
        `${preferences.apiUrl}/v1/saved-items/${item.id}/read-state`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isRead: !item.isRead }),
        },
      );
      if (response.ok) {
        await showToast({
          style: Toast.Style.Success,
          title: item.isRead ? "Marked as unread" : "Marked as read",
        });
        revalidate();
      } else if (response.status === 401) {
        await oauthClient.removeTokens();
        throw new Error("Unauthorized. Run the command again to reconnect.");
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update read state",
        message: String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search saved items..."
    >
      {savedItems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Bookmark}
          title="No saved items"
          description="Your reading queue is empty. Save URLs from Safari, Chrome, or other apps."
        />
      ) : (
        savedItems.map((item) => (
          <List.Item
            key={item.id}
            icon={getFavicon(item.originalUrl, {
              fallback: getTypeIcon(item.type),
            })}
            title={`${item.isRead ? "" : "• "}${item.title ?? item.originalUrl}`}
            subtitle={isShowingDetail ? undefined : item.host}
            keywords={[
              item.host,
              ...(item.description ? [item.description] : []),
              ...item.tags,
            ]}
            accessories={
              isShowingDetail
                ? undefined
                : [
                    { text: formatDate(item.lastSavedAt) },
                    ...(item.enrichmentStatus === "pending"
                      ? [{ icon: Icon.Clock, tooltip: "Enriching..." }]
                      : []),
                  ]
            }
            detail={
              <List.Item.Detail
                markdown={
                  item.previewSummary
                    ? `**Preview:** ${item.previewSummary}\n\n${item.description ?? ""}`
                    : item.description
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Open in Browser"
                  icon={Icon.Globe}
                  onAction={() => handleOpen(item)}
                />
                <Action
                  title="Open in Sleevy"
                  icon={Icon.AppWindow}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  onAction={() => open(`${webUrl}/library`)}
                />
                <Action
                  title={isShowingDetail ? "Hide Details" : "Show Details"}
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                  onAction={() => setIsShowingDetail((v) => !v)}
                />
                <Action
                  title={item.isRead ? "Mark as Unread" : "Mark as Read"}
                  icon={item.isRead ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => handleToggleRead(item)}
                />
                <Action
                  title="Copy URL"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={() => Clipboard.copy(item.originalUrl)}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(item)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default withAccessToken({
  client: oauthClient,
  authorize,
})(YourLibrary);
