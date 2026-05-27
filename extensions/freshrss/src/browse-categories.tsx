import { useState, useEffect, useCallback } from "react";
import { List, Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { getCategories, getArticlesByCategory } from "./api/freshrss";
import { ArticleList } from "./components/ArticleList";
import type { Category, Article } from "./api/types";
import { FreshRSSAuthError, FreshRSSApiError } from "./api/freshrss";

export default function BrowseByCategoryCommand() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [continuation, setContinuation] = useState<string | undefined>(undefined);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getCategories();
      setCategories(result);
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to load categories. Check your FreshRSS connection.";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectCategory = useCallback(async (category: Category) => {
    setSelectedCategory(category);
    setArticlesLoading(true);
    setContinuation(undefined);
    try {
      const result = await getArticlesByCategory(category.id);
      setArticles(result.articles);
      setContinuation(result.continuation);
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to load articles for this category.";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
      setArticles([]);
    } finally {
      setArticlesLoading(false);
    }
  }, []);

  const loadMoreArticles = useCallback(async () => {
    if (!continuation || !selectedCategory) return;
    try {
      const result = await getArticlesByCategory(selectedCategory.id, continuation);
      setArticles((prev) => [...prev, ...result.articles]);
      setContinuation(result.continuation);
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to load more articles.";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    }
  }, [continuation, selectedCategory]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleToggleRead = useCallback((articleId: string, isRead: boolean) => {
    setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, isRead } : a)));
  }, []);

  const handleToggleStar = useCallback((articleId: string, isStarred: boolean) => {
    setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, isStarred } : a)));
  }, []);

  if (selectedCategory) {
    return (
      <ArticleList
        articles={articles}
        isLoading={articlesLoading}
        onRefresh={() => selectCategory(selectedCategory)}
        onLoadMore={continuation ? loadMoreArticles : undefined}
        hasMore={!!continuation}
        mode="mixed"
        onToggleRead={handleToggleRead}
        onToggleStar={handleToggleStar}
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Categories" searchBarPlaceholder="Search categories...">
      {categories.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No categories found"
          description="No categories/labels are defined in your FreshRSS instance"
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={fetchCategories} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : (
        categories.map((category) => (
          <List.Item
            key={category.id}
            id={category.id}
            title={category.label}
            icon={Icon.Tag}
            accessories={category.unreadCount !== undefined ? [{ text: `${category.unreadCount} unread` }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Browse Category"
                  icon={Icon.ArrowRight}
                  onAction={() => selectCategory(category)}
                />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchCategories} shortcut={{ modifiers: ["cmd", "shift"], key: "r" }} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}