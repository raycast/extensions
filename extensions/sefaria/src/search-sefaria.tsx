import React, { useState } from "react";
import { List } from "@raycast/api";
import { useSefariaCategories } from "./lib/hooks/useSefaria";
import { SourceDetail } from "./lib/components/SourceDetail";
import { SearchList } from "./lib/components/SearchList";
import { CategoryList } from "./lib/components/CategoryList";
import { APP_CONSTANTS } from "./lib/constants/app";
import { SearchResult } from "./lib/types/sefaria";

/**
 * Main search command component with category-based search
 */
export default function SearchSefariaCommand() {
  const [query, setQuery] = useState("");
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [selectedCategoryData, setSelectedCategoryData] = useState<{ name: string; results: SearchResult[] } | null>(
    null,
  );

  // Get category data for the first stage
  const { data: categoryData, isLoading: categoryLoading, error: categoryError } = useSefariaCategories(query);

  const handleSelectCategory = (categoryName: string, categoryResults: SearchResult[]) => {
    setSelectedCategoryData({ name: categoryName, results: categoryResults });
  };

  const handleSelectResult = (reference: string) => {
    setSelectedReference(reference);
  };

  // If viewing a specific source
  if (selectedReference) {
    return <SourceDetail reference={selectedReference} />;
  }

  // If viewing results within a category
  if (selectedCategoryData) {
    // Use the pre-filtered results from the selected category
    const categoryResults = {
      results: selectedCategoryData.results,
      totalCount: selectedCategoryData.results.length,
      hasMore: false,
    };

    return (
      <List
        isShowingDetail
        searchBarPlaceholder="Search Sefaria..."
        onSearchTextChange={setQuery}
        throttle={true}
        isLoading={false}
      >
        <SearchList
          query={query}
          data={categoryResults}
          error={undefined}
          isLoading={false}
          onSelectResult={handleSelectResult}
        />
      </List>
    );
  }

  // Determine loading state: only show loading when we have a query and no data yet
  const shouldShowLoading = categoryLoading && query.length > 0 && !categoryData;

  // Default view: show categories
  return (
    <List
      searchBarPlaceholder="Search Sefaria..."
      onSearchTextChange={setQuery}
      throttle={true}
      isLoading={shouldShowLoading}
    >
      {query.length > 0 ? (
        <CategoryList
          query={query}
          data={categoryData}
          error={categoryError}
          isLoading={categoryLoading}
          onSelectCategory={handleSelectCategory}
        />
      ) : (
        <List.EmptyView
          title={APP_CONSTANTS.MESSAGES.SUCCESS.START_TYPING}
          description={APP_CONSTANTS.MESSAGES.SUCCESS.START_TYPING_SUBTITLE}
          icon={APP_CONSTANTS.ICONS.SEARCH}
        />
      )}
    </List>
  );
}
