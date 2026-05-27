import { useEffect, useState, useCallback } from "react";
import { showToast, Toast, Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { refreshFeeds } from "./api/freshrss";
import { FreshRSSAuthError, FreshRSSApiError } from "./api/freshrss";

export default function RefreshFeedsCommand() {
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [message, setMessage] = useState("Refreshing feeds...");

  const doRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setMessage("Refreshing feeds...");
    try {
      await refreshFeeds();
      setMessage("Feeds refreshed successfully.");
      await showToast({ style: Toast.Style.Success, title: "Feeds Refreshed" });
    } catch (error: unknown) {
      const errorMsg =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to refresh feeds. Check your FreshRSS connection.";
      setMessage(`Error: ${errorMsg}`);
      await showToast({ style: Toast.Style.Failure, title: "Error", message: errorMsg });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    doRefresh();
  }, [doRefresh]);

  return (
    <Detail
      isLoading={isRefreshing}
      markdown={message}
      actions={
        <ActionPanel>
          <Action title="Refresh Again" icon={Icon.ArrowClockwise} onAction={doRefresh} />
        </ActionPanel>
      }
    />
  );
}
