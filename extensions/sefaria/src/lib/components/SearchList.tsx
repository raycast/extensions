import React from "react";
import { List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { extractTitleFromId, extractReferenceFromId, cleanHighlightTags, truncateText } from "../utils/text-processing";
import { SearchResultActionPanel, ErrorActionPanel, NoResultsActionPanel } from "./ActionPanels";
import { APP_CONSTANTS } from "../constants/app";
import { SearchListProps } from "../types/sefaria";

/**
 * Reusable component for displaying Sefaria search results with infinite scroll
 */
export function SearchList({ query, data, error, isLoading, onSelectResult }: Omit<SearchListProps, "pagination">) {
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

  // Don't render anything while loading - let parent handle the loading state
  if (isLoading && !data) {
    return null;
  }

  // Show "no results" only if we're not loading and have no data or empty results
  if (!isLoading && (!data || !data.results || data.results.length === 0)) {
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
      {data?.results?.map((result, index) => {
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
        const previewText = truncateText(cleanFirstHighlight) || `Score: ${result._score?.toFixed(2) || "N/A"}`;

        return (
          <List.Item
            key={`${result._id}-${index}`}
            title={title}
            subtitle={previewText}
            accessories={[
              { text: result._index || "Unknown" },
              { text: `Score: ${result._score?.toFixed(2) || "N/A"}` },
              { text: `${index + 1}/${data.totalCount || "?"}` },
            ]}
            detail={
              <List.Item.Detail
                markdown={`
## ${title}

**Highlighted Matches:**
${cleanAllHighlights || "No highlights available"}

**Score:** ${result._score?.toFixed(2) || "N/A"}
**Index:** ${result._index || "Unknown"}
**ID:** ${result._id || "Unknown"}
**Position:** ${index + 1} of ${data.totalCount || "?"} total results

**Raw Highlights (${exactHighlights.length}):**
${exactHighlights.length > 0 ? exactHighlights.map((highlight, i) => `${i + 1}. ${cleanHighlightTags(highlight)}`).join("\n") : "No highlights available"}
                `}
              />
            }
            actions={
              <SearchResultActionPanel
                reference={reference}
                title={title}
                highlightedText={cleanAllHighlights || "No highlights available"}
                firstMatch={cleanFirstHighlight || "No match available"}
                onViewFullSource={() => onSelectResult(reference)}
              />
            }
          />
        );
      })}
    </>
  );
}
