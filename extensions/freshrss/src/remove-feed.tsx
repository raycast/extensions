import { useState, useEffect, useCallback } from "react";
import { confirmAlert, Alert, showToast, Toast, Action, ActionPanel, Icon } from "@raycast/api";
import { getFeeds, removeFeed } from "./api/freshrss";
import { FeedList } from "./components/FeedList";
import type { Feed } from "./api/types";
import { FreshRSSAuthError, FreshRSSApiError } from "./api/freshrss";

export default function RemoveFeedCommand() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getFeeds(true);
      setFeeds(result);
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to load feeds. Check your FreshRSS connection.";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
      setFeeds([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleRemove(feed: Feed) {
    if (
      !(await confirmAlert({
        title: "Remove Feed",
        message: `Are you sure you want to unsubscribe from "${feed.title}"?`,
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      }))
    ) {
      return;
    }

    try {
      await removeFeed(feed.id);
      await showToast({ style: Toast.Style.Success, title: "Feed Removed", message: feed.title });
      setFeeds((prev) => prev.filter((f) => f.id !== feed.id));
    } catch (error: unknown) {
      let message: string;
      if (error instanceof FreshRSSAuthError) {
        message = error.message;
      } else if (error instanceof FreshRSSApiError) {
        message = error.message;
      } else {
        message = "Failed to remove feed.";
      }
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    }
  }

  return (
    <FeedList
      feeds={feeds}
      isLoading={isLoading}
      onRefresh={fetchData}
      emptyTitle="No feeds to remove"
      emptyDescription="There are no feeds in your FreshRSS subscriptions"
      actions={(feed: Feed) => (
        <Action
          title="Remove Feed"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => handleRemove(feed)}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
        />
      )}
    />
  );
}