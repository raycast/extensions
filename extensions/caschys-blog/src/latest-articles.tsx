import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import React from "react";
import { Article, fetchArticles, safeParseDate } from "./utils";
import ArticleActions from "./components/ArticleActions";
import ArticleListItem from "./components/ArticleListItem";

/**
 * Latest Articles Command
 *
 * This component displays a list of the latest articles from Caschys Blog.
 * It allows users to:
 * - View a list of the most recent articles
 * - Search through articles by title, description, author, and categories
 * - View article details
 * - Open articles in browser
 * - Copy article links
 * - Submit tips to the blog
 *
 * @returns {JSX.Element} The Latest Articles list view
 */
export default function LatestArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");
  const [category, setCategory] = useState<string>("all");

  const loadArticles = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      setArticles(await fetchArticles(forceRefresh));
    } catch (error) {
      await showFailureToast(error, { title: "Failed to load articles" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  /**
   * Filter articles based on search text
   * Searches in title, description, creator, and categories
   */
  const sortedArticles = useMemo(() => {
    const searchLower = searchText.trim().toLowerCase();
    return articles
      .filter((article) => {
        const matchesCategory = category === "all" || article.categories?.includes(category);
        if (!matchesCategory) return false;
        if (!searchLower) return true;
        return Boolean(
          article.title.toLowerCase().includes(searchLower) ||
          article.description.toLowerCase().includes(searchLower) ||
          article.creator?.toLowerCase().includes(searchLower) ||
          article.categories?.some((articleCategory) => articleCategory.toLowerCase().includes(searchLower)),
        );
      })
      .sort((a, b) => safeParseDate(b.pubDate) - safeParseDate(a.pubDate));
  }, [articles, category, searchText]);

  const categories = useMemo(
    () => [...new Set(articles.flatMap((article) => article.categories ?? []))].sort((a, b) => a.localeCompare(b)),
    [articles],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search articles..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by category" value={category} onChange={setCategory}>
          <List.Dropdown.Item title="All Categories" value="all" />
          {categories.map((articleCategory) => (
            <List.Dropdown.Item key={articleCategory} title={articleCategory} value={articleCategory} />
          ))}
        </List.Dropdown>
      }
    >
      {sortedArticles.length === 0 && !isLoading ? (
        <List.EmptyView
          title={searchText ? "No matching articles" : "No articles available"}
          description={searchText ? "Try another search term" : "Refresh to try the feed again"}
          actions={
            <ActionPanel>
              <Action title="Refresh Articles" icon={Icon.ArrowClockwise} onAction={() => loadArticles(true)} />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section title="Latest Articles" subtitle={`${sortedArticles.length} of ${articles.length} articles`}>
        {sortedArticles.map((article) => (
          <ArticleListItem
            key={article.guid || article.link}
            article={article}
            actions={<ArticleActions article={article} onRefresh={() => void loadArticles(true)} showSubmitTip />}
          />
        ))}
      </List.Section>
    </List>
  );
}
