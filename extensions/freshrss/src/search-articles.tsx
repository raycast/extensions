import { useState, useCallback, useEffect } from "react";
import { List, showToast, Toast } from "@raycast/api";
import { searchArticles } from "./api/freshrss";
import { ArticleList } from "./components/ArticleList";
import type { Article } from "./api/types";
import { FreshRSSAuthError, FreshRSSApiError } from "./api/freshrss";

export default function SearchArticlesCommand() {
  const [searchText, setSearchText] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [continuation, setContinuation] = useState<string | undefined>(undefined);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setArticles([]);
      setContinuation(undefined);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await searchArticles(query);
      setArticles(result.articles);
      setContinuation(result.continuation);
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to search articles. Check your FreshRSS connection.";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadMore = useCallback(async () => {
    if (!continuation || !searchText.trim()) return;
    try {
      const result = await searchArticles(searchText, continuation);
      setArticles((prev) => [...prev, ...result.articles]);
      setContinuation(result.continuation);
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to load more results.";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    }
  }, [continuation, searchText]);

  const handleToggleRead = useCallback((articleId: string, isRead: boolean) => {
    setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, isRead } : a)));
  }, []);

  const handleToggleStar = useCallback((articleId: string, isStarred: boolean) => {
    setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, isStarred } : a)));
  }, []);

  if (articles.length > 0 || isLoading) {
    return (
      <ArticleList
        articles={articles}
        isLoading={isLoading}
        onRefresh={() => performSearch(searchText)}
        onLoadMore={continuation ? loadMore : undefined}
        hasMore={!!continuation}
        mode="mixed"
        onToggleRead={handleToggleRead}
        onToggleStar={handleToggleStar}
        onSearchTextChange={setSearchText}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Articles"
      searchBarPlaceholder="Search articles..."
      onSearchTextChange={setSearchText}
    >
      {searchText.trim() ? (
        <List.EmptyView
          title="No results found"
          description={`No articles match "${searchText}"`}
        />
      ) : null}
    </List>
  );
}
