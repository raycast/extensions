import React from "react";
import { List, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import { CategoryListProps } from "../types/sefaria";
import { APP_CONSTANTS } from "../constants/app";
import { ErrorActionPanel, NoResultsActionPanel } from "./ActionPanels";

/**
 * Component for displaying Sefaria search results grouped by category
 */
export function CategoryList({ query, data, error, isLoading, onSelectCategory }: CategoryListProps) {
  if (error) {
    showToast(Toast.Style.Failure, APP_CONSTANTS.MESSAGES.ERROR.SEARCH_FAILED, error.message);
    return (
      <List.Item
        title="Search Error"
        subtitle={error.message}
        accessories={[{ text: APP_CONSTANTS.ICONS.ERROR }]}
        actions={<ErrorActionPanel />}
      />
    );
  }

  // Only show loading state if we have no data at all
  if (isLoading && !data?.categories.length) {
    return null; // Let the parent List handle loading state
  }

  if (!data?.categories.length && !isLoading) {
    return (
      <List.Item
        title={APP_CONSTANTS.MESSAGES.SUCCESS.NO_RESULTS_TITLE}
        subtitle={`No results for "${query}"`}
        accessories={[{ text: APP_CONSTANTS.ICONS.NO_RESULTS }]}
        actions={<NoResultsActionPanel query={query} />}
      />
    );
  }

  return (
    <>
      {data?.categories.map((category) => (
        <List.Item
          key={category.category}
          title={category.category}
          subtitle={`${category.count} results`}
          accessories={[{ text: `${category.count} results` }, { text: APP_CONSTANTS.ICONS.SEARCH }]}
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
