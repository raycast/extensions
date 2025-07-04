import React from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { extractTitleFromId, extractReferenceFromId, cleanHighlightTags, truncateText } from "../utils/text-processing";
import { SearchResultActionPanel, ErrorActionPanel, NoResultsActionPanel } from "./ActionPanels";
import { APP_CONSTANTS } from "../constants/app";
import { SearchListProps } from "../types/sefaria";

/**
 * Reusable component for displaying Sefaria search results with infinite scroll
 */
export function SearchList({
  query,
  data,
  error,
  isLoading,
  onSelectResult,
  selectedCategory,
  onBackToCategories,
}: Omit<SearchListProps, "pagination">) {
  if (error) {
    showFailureToast(error, { title: APP_CONSTANTS.MESSAGES.ERROR.SEARCH_FAILED });
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
  if (isLoading && !data?.results.length) {
    return null; // Let the parent List handle loading state
  }

  if (!data?.results.length && !isLoading) {
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
      {selectedCategory && onBackToCategories && (
        <List.Item
          title={`← Back to Categories`}
          subtitle={`Currently viewing: ${selectedCategory}`}
          accessories={[{ text: "⬅️" }]}
          actions={
            <ActionPanel>
              <Action
                title="Back to Categories"
                onAction={onBackToCategories}
                icon="⬅️"
                shortcut={APP_CONSTANTS.SHORTCUTS.BACK_TO_CATEGORIES}
              />
            </ActionPanel>
          }
        />
      )}
      {data?.results.map((result, index) => {
        // Extract content from highlight fields - API only returns 'exact' field
        const exactHighlights = result.highlight?.exact || [];
        const firstHighlight = exactHighlights[0] || "";
        const allHighlights = exactHighlights.join(" ... ");

        // Extract a readable title from the ID
        const title = extractTitleFromId(result._id, index);
        const reference = extractReferenceFromId(result._id);

        // Clean highlight content for display
        const cleanFirstHighlight = cleanHighlightTags(firstHighlight);
        const cleanAllHighlights = cleanHighlightTags(allHighlights);

        // Create a preview subtitle from the first highlight
        const previewText = truncateText(cleanFirstHighlight) || `Score: ${result._score.toFixed(2)}`;

        return (
          <List.Item
            key={`${result._id}-${index}`}
            title={title}
            subtitle={previewText}
            accessories={[
              { text: result._index },
              { text: `Score: ${result._score.toFixed(2)}` },
              { text: `${index + 1}/${data.totalCount}` },
            ]}
            detail={
              <List.Item.Detail
                markdown={`
## ${title}

**Highlighted Matches:**
${cleanAllHighlights}

**Score:** ${result._score.toFixed(2)}
**Index:** ${result._index}
**ID:** ${result._id}
**Position:** ${index + 1} of ${data.totalCount} total results

**Raw Highlights (${exactHighlights.length}):**
${exactHighlights.map((highlight, i) => `${i + 1}. ${cleanHighlightTags(highlight)}`).join("\n")}
                `}
              />
            }
            actions={
              <SearchResultActionPanel
                reference={reference}
                title={title}
                highlightedText={cleanAllHighlights}
                firstMatch={cleanFirstHighlight}
                onViewFullSource={() => onSelectResult(reference)}
              />
            }
          />
        );
      })}
    </>
  );
}
