import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { Article } from "../api/type";
import { ArticleListItem } from "./ArticleListItem";
import { limitArticles } from "../preferences";
import { getErrorMessage } from "../utils/errors";

interface NewsListViewProps {
  fetchFn: () => Promise<Article[]>;
  searchBarPlaceholder: string;
  errorToastTitle: string;
  emptyTitle: string;
  emptyDescription: string;
}

export function NewsListView({
  fetchFn,
  searchBarPlaceholder,
  errorToastTitle,
  emptyTitle,
  emptyDescription,
}: NewsListViewProps) {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchFn, [], {
    keepPreviousData: true,
    onError: (err) => {
      void showFailureToast({
        title: errorToastTitle,
        message: getErrorMessage(err) ?? "Unknown error",
      });
    },
  });

  const handleRefresh = useCallback(() => {
    void revalidate();
  }, [revalidate]);

  const articles = limitArticles(data ?? []);
  const errorMessage = getErrorMessage(error);

  const emptyView = useMemo(() => {
    if (errorMessage) {
      return {
        icon: Icon.ExclamationMark,
        title: "Unable to load articles",
        description: errorMessage,
      };
    }

    if (!isLoading && articles.length === 0) {
      return {
        icon: Icon.Document,
        title: emptyTitle,
        description: emptyDescription,
      };
    }

    return null;
  }, [errorMessage, isLoading, articles.length, emptyTitle, emptyDescription]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!emptyView}
      searchBarPlaceholder={searchBarPlaceholder}
    >
      {emptyView ? (
        <List.EmptyView
          icon={emptyView.icon}
          title={emptyView.title}
          description={emptyView.description}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        articles.map((article) => (
          <ArticleListItem
            key={article.id}
            article={article}
            onRefresh={handleRefresh}
          />
        ))
      )}
    </List>
  );
}
