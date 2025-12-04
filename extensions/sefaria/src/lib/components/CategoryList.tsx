import React from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CategoryListProps } from "../types/sefaria";
import { APP_CONSTANTS } from "../constants/app";
import { ErrorActionPanel, NoResultsActionPanel } from "./ActionPanels";

/**
 * Component for displaying Sefaria search results grouped by category
 */
export function CategoryList({ query, data, error, isLoading, onSelectCategory }: CategoryListProps) {
  if (error) {
    showFailureToast(APP_CONSTANTS.MESSAGES.ERROR.SEARCH_FAILED);
    return (
      <List.Item
        title="Search Error"
        subtitle={error.message}
        accessories={[{ text: APP_CONSTANTS.ICONS.ERROR }]}
        actions={<ErrorActionPanel />}
      />
    );
  }

  // Don't render anything while loading - let parent handle the loading state
  if (isLoading && !data) {
    return null;
  }

  // Show "no results" only if we're not loading and have no data or empty categories
  if (!isLoading && (!data || !data.categories || data.categories.length === 0)) {
    return (
      <List.Item
        title={APP_CONSTANTS.MESSAGES.SUCCESS.NO_RESULTS_TITLE}
        subtitle={query ? `No results for "${query}"` : "Enter a search term to begin"}
        accessories={[{ text: APP_CONSTANTS.ICONS.NO_RESULTS }]}
        actions={query ? <NoResultsActionPanel query={query} /> : undefined}
      />
    );
  }

  return (
    <>
      {data?.categories?.map((category) => (
        <List.Item
          key={category.category}
          title={category.category}
          subtitle={`${category.count} ${category.count === 1 ? "result" : "results"}`}
          accessories={[{ text: `${category.count}` }, { text: APP_CONSTANTS.ICONS.SEARCH }]}
          actions={
            <ActionPanel>
              <Action
                title="View Results"
                onAction={() => onSelectCategory(category.category, category.results)}
                icon={APP_CONSTANTS.ICONS.VIEW_SOURCE}
              />
            </ActionPanel>
          }
        />
      ))}
    </>
  );
}
