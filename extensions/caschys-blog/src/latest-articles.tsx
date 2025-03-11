// src/latest-articles.tsx

import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import React from "react";
import { Article, fetchArticles } from "./utils";
import ArticleDetail from "./components/ArticleDetail";
import ArticleListItem from "./components/ArticleListItem";
import SubmitTip from "./submit-tip";

export default function LatestArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");

  // Load preferences but don't use them directly in this component
  // They are used in the fetchArticles function
  getPreferenceValues();

  // Load articles
  useEffect(() => {
    async function loadArticles() {
      setIsLoading(true);
      try {
        // Force refresh on component mount to clear cache
        const fetchedArticles = await fetchArticles(true);
        setArticles(fetchedArticles);
      } finally {
        setIsLoading(false);
      }
    }

    loadArticles();
  }, []);

  // Filter articles based on search
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

  // Sort articles by date
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search articles..."
      onSearchTextChange={setSearchText}
      throttle
      navigationTitle="Latest Articles"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          storeValue={true}
          onChange={() => {}} // Placeholder for future sorting functionality
        >
          <List.Dropdown.Item title="Newest first" value="newest" icon={Icon.Calendar} />
        </List.Dropdown>
      }
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
