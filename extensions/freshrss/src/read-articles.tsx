import { useState, useEffect, useCallback } from "react";
import { getReadArticles } from "./api/freshrss";
import { ArticleList } from "./components/ArticleList";
import type { Article } from "./api/types";
import { showToast, Toast } from "@raycast/api";
import { FreshRSSAuthError, FreshRSSApiError } from "./api/freshrss";

export default function ReadArticlesCommand() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [continuation, setContinuation] = useState<string | undefined>(undefined);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getReadArticles();
      setArticles(result.articles);
      setContinuation(result.continuation);
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to load read articles. Check your FreshRSS connection.";
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
      const result = await getReadArticles(continuation);
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

  return (
    <ArticleList
      articles={articles}
      isLoading={isLoading}
      onRefresh={fetchData}
      onLoadMore={continuation ? loadMore : undefined}
      hasMore={!!continuation}
      mode="read"
      onToggleRead={handleToggleRead}
      onToggleStar={handleToggleStar}
    />
  );
}