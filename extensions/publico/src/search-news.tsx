import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  searchArticlesByTag,
  fetchArticleDetail,
  getArticleId,
} from "./api/client";
import { Article } from "./api/type";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ArticleListItem } from "./components/ArticleListItem";
import { DETAIL_LOAD_DEBOUNCE_MS } from "./constants";
import { limitArticles } from "./preferences";
import { getErrorMessage } from "./utils/errors";

/**
 * Público's own full-text search. The extension cannot query it directly:
 * the route sits behind an AWS WAF JavaScript challenge that needs a browser
 * engine. Handing the query to the browser is the closest we can get.
 */
function publicoSearchUrl(searchText: string): string {
  return `https://www.publico.pt/pesquisa?query=${encodeURIComponent(searchText)}`;
}

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
    data: rawArticles = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (query: string) => {
      if (!query.trim()) {
        return [];
      }
      return await searchArticlesByTag(query);
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

  const articles = limitArticles(rawArticles);

  const handleRefresh = useCallback(() => {
    void revalidate();
  }, [revalidate]);

  // Build a lookup from article ID to article for onSelectionChange
  const articleById = useMemo(() => {
    const map = new Map<string, Article>();
    for (const article of articles) {
      map.set(String(article.id), article);
    }
    return map;
  }, [articles]);

  // Debounce article detail loading to reduce API calls when scrolling quickly
  useEffect(() => {
    if (!pendingArticle) {
      return;
    }

    const articleId = getArticleId(pendingArticle);

    // Cancel any previous in-flight request and pending timer FIRST. Doing
    // this after the early return below left a request running, and its
    // spinner showing on the previously selected row, whenever the next
    // selection was already cached.
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoadingDetails(false);

    // Skip if already loaded
    if (!articleId || enrichedArticles[articleId]) {
      return;
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

    // Cleanup on unmount or when pendingArticle changes. The request is
    // aborted as well as the timer, so closing the command does not leave a
    // fetch running to its 10 second timeout.
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [pendingArticle, enrichedArticles]);

  const errorMessage = getErrorMessage(error);

  const emptyView = useMemo(() => {
    // useCachedPromise keeps the previous results on error. Showing the error
    // view would hide results that are still valid, and the failure is already
    // reported by the toast in onError.
    if (errorMessage && articles.length === 0) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load results"
          description={errorMessage}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Search on Público.pt"
                url={publicoSearchUrl(searchText)}
              />
            </ActionPanel>
          }
        />
      );
    }

    if (searchText.trim() === "") {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Browse Público topics"
          description='Type a subject, person, place, or team. For example "Benfica", "Trump", "inteligência artificial".'
        />
      );
    }

    if (!isLoading && articles.length === 0) {
      return (
        <List.EmptyView
          icon={Icon.XmarkCircle}
          title="No topic matches that"
          description={`Público has no topic for "${searchText}". This command matches topics, so single subjects, names, places, and teams work best. Press Enter to search publico.pt for the full text instead.`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Search on Público.pt"
                url={publicoSearchUrl(searchText)}
              />
            </ActionPanel>
          }
        />
      );
    }

    return null;
  }, [articles.length, errorMessage, isLoading, searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Público topics…"
      isShowingDetail
      throttle
      onSelectionChange={(id) => {
        if (!id) {
          return;
        }

        const selectedArticle = articleById.get(id);
        if (selectedArticle) {
          setPendingArticle(selectedArticle);
        }
      }}
    >
      {emptyView
        ? emptyView
        : articles.map((article) => {
            const articleId = getArticleId(article);
            const enrichedData = articleId
              ? enrichedArticles[articleId]
              : undefined;
            const isSelected =
              articleId === selectedArticleId && isLoadingDetails;

            return (
              <ArticleListItem
                key={article.id}
                article={article}
                enrichedArticle={enrichedData}
                isLoadingDetail={isSelected}
                onRefresh={handleRefresh}
              />
            );
          })}
    </List>
  );
}
