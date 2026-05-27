import { useState, useEffect, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { getArticlesByFeed } from "../api/freshrss";
import { ArticleList } from "./ArticleList";
import type { Article } from "../api/types";
import { FreshRSSAuthError, FreshRSSApiError } from "../api/freshrss";

type FeedArticlesViewProps = {
  feedId: string;
  feedTitle?: string;
};

export function FeedArticlesView({ feedId, feedTitle }: FeedArticlesViewProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [continuation, setContinuation] = useState<string | undefined>(undefined);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getArticlesByFeed(feedId);
      setArticles(result.articles);
      setContinuation(result.continuation);
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to load articles for this feed.";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [feedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadMore = useCallback(async () => {
    if (!continuation) return;
    try {
      const result = await getArticlesByFeed(feedId, continuation);
      setArticles((prev) => [...prev, ...result.articles]);
      setContinuation(result.continuation);
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to load more articles.";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    }
  }, [continuation, feedId]);

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
      mode="mixed"
      onToggleRead={handleToggleRead}
      onToggleStar={handleToggleStar}
    />
  );
}