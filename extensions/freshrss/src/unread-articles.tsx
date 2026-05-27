import { useState, useEffect, useCallback } from "react";
import { getUnreadArticles, markAllAsRead, FreshRSSAuthError, FreshRSSApiError } from "./api/freshrss";
import { ArticleList } from "./components/ArticleList";
import type { Article } from "./api/types";
import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";

export default function UnreadArticlesCommand() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [continuation, setContinuation] = useState<string | undefined>(undefined);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getUnreadArticles();
      setArticles(result.articles);
      setContinuation(result.continuation);
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to load unread articles. Check your FreshRSS connection.";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadMore = useCallback(async () => {
    if (!continuation) return;
    try {
      const result = await getUnreadArticles(continuation);
      setArticles((prev) => [...prev, ...result.articles]);
      setContinuation(result.continuation);
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to load more articles.";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    }
  }, [continuation]);

  const handleToggleRead = useCallback((articleId: string, isRead: boolean) => {
    setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, isRead } : a)));
  }, []);

  const handleToggleStar = useCallback((articleId: string, isStarred: boolean) => {
    setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, isStarred } : a)));
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    if (articles.length === 0) return;
    if (
      !(await confirmAlert({
        title: "Mark All as Read",
        message: `Mark ${articles.length} articles as read?`,
        primaryAction: { title: "Mark All Read" },
      }))
    ) {
      return;
    }
    try {
      await markAllAsRead(articles.map((a) => a.id));
      setArticles((prev) => prev.map((a) => ({ ...a, isRead: true })));
      await showToast({ style: Toast.Style.Success, title: "All articles marked as read" });
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to mark all as read.";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    }
  }, [articles]);

  return (
    <ArticleList
      articles={articles}
      isLoading={isLoading}
      onRefresh={fetchData}
      onLoadMore={continuation ? loadMore : undefined}
      hasMore={!!continuation}
      mode="unread"
      onToggleRead={handleToggleRead}
      onToggleStar={handleToggleStar}
      onMarkAllAsRead={handleMarkAllAsRead}
    />
  );
}