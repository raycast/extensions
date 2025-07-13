import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import React from "react";
import { Article, fetchArticles, safeParseDate } from "./utils";
import ArticleDetail from "./components/ArticleDetail";
import ArticleListItem from "./components/ArticleListItem";
import SubmitTip from "./submit-tip";

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

  /**
   * Load articles on component mount
   * Fetches articles from the blog and handles loading state and errors
   */
  useEffect(() => {
    async function loadArticles() {
      setIsLoading(true);
      try {
        // Force refresh on component mount to clear cache
        const fetchedArticles = await fetchArticles(true);
        setArticles(fetchedArticles);
      } catch (error) {
        showFailureToast(error, { title: "Failed to load articles" });
      } finally {
        setIsLoading(false);
      }
    }

    loadArticles();
  }, []);

  /**
   * Filter articles based on search text
   * Searches in title, description, creator, and categories
   */
  const filteredArticles = articles.filter((article) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    return (
      article.title.toLowerCase().includes(searchLower) ||
      article.description.toLowerCase().includes(searchLower) ||
      (article.creator && article.creator.toLowerCase().includes(searchLower)) ||
      (article.categories && article.categories.some((category) => category.toLowerCase().includes(searchLower)))
    );
  });

  /**
   * Sort articles by publication date (newest first)
   * Uses safeParseDate to handle potential invalid date strings
   */
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    return safeParseDate(b.pubDate) - safeParseDate(a.pubDate);
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search articles..."
      onSearchTextChange={setSearchText}
      throttle
      navigationTitle="Latest Articles"
    >
      <List.Section title="Latest Articles" subtitle={`${filteredArticles.length} of ${articles.length} articles`}>
        {sortedArticles.map((article) => (
          <ArticleListItem
            key={article.guid || article.link}
            article={article}
            actions={
              <ActionPanel>
                <Action.Push title="Show Article" icon={Icon.Eye} target={<ArticleDetail article={article} />} />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={article.link}
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={article.link}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <ActionPanel.Section title="Navigation">
                  <Action.Push
                    title="Submit Tip"
                    icon={Icon.Envelope}
                    target={<SubmitTip />}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
