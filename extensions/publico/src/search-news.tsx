import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  searchArticles,
  fetchArticleDetail,
  extractArticleId,
} from "./api/client";
import { Article } from "./api/type";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  cleanDescription,
  extractTags,
  formatAuthors,
  getArticleIcon,
  getArticleUrl,
  getTagColor,
  DEFAULT_METADATA_PLACEHOLDER,
  resolvePublishedDate,
} from "./utils/article";

const MAX_TAGS = 6;
const SUMMARY_PLACEHOLDER = "No summary available.";
const UNTITLED_ARTICLE = "Untitled";
const DETAIL_LOAD_DEBOUNCE_MS = 150;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null,
  );
  const [pendingArticle, setPendingArticle] = useState<Article | null>(null);
  const [enrichedArticles, setEnrichedArticles] = useState<
    Record<string, Article>
  >({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Track the current abort controller to cancel in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Main search with automatic debouncing and caching
  const {
    data: articles = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (query: string) => {
      if (!query.trim()) {
        return [];
      }
      return await searchArticles(query);
    },
    [searchText],
    {
      keepPreviousData: true,
      initialData: [],
      onError: (err) => {
        const message = err instanceof Error ? err.message : String(err);
        void showFailureToast({ title: "Unable to search Público", message });
      },
    },
  );

  // Debounce article detail loading to reduce API calls when scrolling quickly
  useEffect(() => {
    if (!pendingArticle) {
      return;
    }

    const articleUrl = getArticleUrl(pendingArticle);
    const articleId = extractArticleId(articleUrl);

    // Skip if already loaded
    if (!articleId || enrichedArticles[articleId]) {
      return;
    }

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(async () => {
      // Create new abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setIsLoadingDetails(true);
        setSelectedArticleId(articleId);

        const detail = await fetchArticleDetail(articleId, controller.signal);
        if (!detail) {
          return;
        }

        setEnrichedArticles((prev) => ({
          ...prev,
          [articleId]: detail,
        }));
      } catch (err) {
        // Ignore abort errors - they're intentional when user switches articles
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        // Log error but don't show toast - some articles may not have details
        console.error("Error loading article details:", err);
      } finally {
        setIsLoadingDetails(false);
      }
    }, DETAIL_LOAD_DEBOUNCE_MS);

    // Cleanup timer on unmount or when pendingArticle changes
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [pendingArticle, enrichedArticles]);

  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : String(error)
    : null;

  const emptyView = useMemo(() => {
    if (errorMessage) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to fetch results"
          description={errorMessage}
        />
      );
    }

    if (searchText.trim() === "") {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Público News"
          description="Type a keyword to find articles."
        />
      );
    }

    if (!isLoading && articles.length === 0) {
      return (
        <List.EmptyView
          icon={Icon.XmarkCircle}
          title="No articles found"
          description={`No results for '${searchText}'. Try another search.`}
        />
      );
    }

    return null;
  }, [articles.length, errorMessage, isLoading, searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Público news..."
      isShowingDetail
      throttle
      onSelectionChange={(id) => {
        if (!id) {
          return;
        }

        const [, indexAsString] = id.split("-");
        const index = Number.parseInt(indexAsString, 10);
        const selectedArticle = Number.isNaN(index)
          ? undefined
          : articles[index];

        if (selectedArticle) {
          // Set pending article to trigger debounced loading
          setPendingArticle(selectedArticle);
        }
      }}
    >
      {emptyView
        ? emptyView
        : articles.map((article, index) => {
            const cleanTitle =
              article.titulo?.replace(/<[^>]*>/g, "") || UNTITLED_ARTICLE;
            const articleUrl = getArticleUrl(article);
            const articleId = extractArticleId(articleUrl);
            const enrichedData = articleId
              ? enrichedArticles[articleId]
              : undefined;

            const authorText = formatAuthors(
              enrichedData?.autores ?? article.autores,
            );
            const extractedTags = extractTags(
              enrichedData?.tags ?? article.tags,
            ).slice(0, MAX_TAGS);

            const summarySource = enrichedData?.descricao ?? article.descricao;
            const summary = cleanDescription(summarySource);
            const publishedDate = resolvePublishedDate(enrichedData ?? article);

            const icon = getArticleIcon(article);
            const detailMarkdown = `# ${cleanTitle}\n\n---\n\n${summary || SUMMARY_PLACEHOLDER}\n`;
            const isSelected =
              articleId === selectedArticleId && isLoadingDetails;

            return (
              <List.Item
                key={`article-${index}`}
                id={`article-${index}`}
                icon={icon}
                title={cleanTitle}
                detail={
                  <List.Item.Detail
                    isLoading={isSelected}
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
                        {extractedTags.length > 0 ? (
                          <List.Item.Detail.Metadata.TagList title="Keywords">
                            {extractedTags.map((tag, tagIndex) => (
                              <List.Item.Detail.Metadata.TagList.Item
                                key={`tag-${tagIndex}`}
                                text={tag}
                                color={getTagColor(tagIndex)}
                              />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                        ) : (
                          <List.Item.Detail.Metadata.Label
                            title="Keywords"
                            text={DEFAULT_METADATA_PLACEHOLDER}
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
                        void revalidate();
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
