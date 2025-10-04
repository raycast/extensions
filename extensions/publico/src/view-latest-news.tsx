import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { fetchLatestHeadlines } from "./api/client";
import { Article } from "./api/type";
import { formatDate } from "./utils/formatDate";
import {
  cleanDescription,
  extractTags,
  formatAuthors,
  getArticleIcon,
  getArticleUrl,
  getTagColor,
} from "./utils/article";

const MAX_TAGS = 6;

export default function Command() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await fetchLatestHeadlines();
      setArticles(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      await showToast(
        Toast.Style.Failure,
        "Unable to load latest news",
        message,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchArticles();
  }, [fetchArticles]);

  function getPublishedDate(article: Article): string {
    if (article.data) {
      if (article.data.includes("0001-01-01")) {
        return "Not available";
      }

      return formatDate(article.data);
    }

    if (article.time) {
      return formatDate(article.time);
    }

    return "Not available";
  }

  if (error) {
    return (
      <List
        isLoading={isLoading}
        isShowingDetail
        searchBarPlaceholder="Search latest headlines..."
      >
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load Público news"
          description={error}
        />
      </List>
    );
  }

  if (!isLoading && articles.length === 0) {
    return (
      <List
        isLoading={isLoading}
        isShowingDetail
        searchBarPlaceholder="Search latest headlines..."
      >
        <List.EmptyView
          icon={Icon.Document}
          title="No headlines available"
          description="Try again later to see the latest updates from Público."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search latest headlines..."
    >
      {articles.map((article, index) => {
        const cleanTitle =
          article.titulo?.replace(/<[^>]*>/g, "") || "Untitled";
        const authorText = formatAuthors(article.autores);
        const tags = extractTags(article.tags).slice(0, MAX_TAGS);
        const publishedDate = getPublishedDate(article);
        const icon = getArticleIcon(article);
        const articleUrl = getArticleUrl(article);
        const summary = cleanDescription(article.descricao);
        const detailMarkdown = `# ${cleanTitle}\n\n---\n\n${summary || "No summary available."}\n`;

        return (
          <List.Item
            key={`article-${index}`}
            icon={icon}
            title={cleanTitle}
            detail={
              <List.Item.Detail
                markdown={detailMarkdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Author"
                      text={authorText}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Published"
                      text={publishedDate}
                    />
                    {tags.length > 0 ? (
                      <List.Item.Detail.Metadata.TagList title="Keywords">
                        {tags.map((tag, tagIndex) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={`tag-${tagIndex}`}
                            text={tag}
                            color={getTagColor(tagIndex)}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : (
                      <List.Item.Detail.Metadata.Label
                        title="Topics"
                        text="Not available"
                        icon={Icon.Tag}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={articleUrl}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={articleUrl}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.RotateClockwise}
                  onAction={() => {
                    void fetchArticles();
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
