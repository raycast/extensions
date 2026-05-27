import { useState, useEffect, useCallback } from "react";
import { getFeeds, getUnreadCounts, FreshRSSAuthError, FreshRSSApiError } from "./api/freshrss";
import { FeedList } from "./components/FeedList";
import type { Feed } from "./api/types";
import { showToast, Toast } from "@raycast/api";

export default function ListFeedsCommand() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [feedsResult, countsResult] = await Promise.all([getFeeds(), getUnreadCounts()]);
      setFeeds(feedsResult);
      setUnreadCounts(countsResult);
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

  return <FeedList feeds={feeds} isLoading={isLoading} onRefresh={fetchData} unreadCounts={unreadCounts} />;
}