import { Icon, List } from "@raycast/api";
import { SwiftPackageIndexService } from "../../services/swift-package-index.service";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { SwiftPackageIndexListItem } from "./swift-package-index-list-item.component";
import { SwiftPackageIndexSearchResult } from "../../models/swift-package-index/swift-package-index-search-result.model";
import { SwiftPackageIndexSearchResults } from "../../models/swift-package-index/swift-package-index-search-results.model";
import { XcodeService } from "../../services/xcode.service";

/**
 * Swift Package Index List
 */
export function SwiftPackageIndexList(): JSX.Element {
  // Use is Xcode installed Promise
  const isXcodeInstalled = usePromise(XcodeService.isXcodeInstalled, [], {
    onError: () => Promise.resolve(),
  });
  // Use search text state
  const [searchText, setSearchText] = useState<string>("");
  // Use page state. Default value `1`
  const [page, setPage] = useState<number | undefined>(1);
  // Set Swift Package Index Search Results state to concat results on a page update
  const [searchResults, setSearchResults] = useState<SwiftPackageIndexSearchResult[]>([]);
  // Use AbortController reference
  const abortable = useRef<AbortController>();
  // Use Promise to load Swift Package Index Search Results
  const swiftPackageIndexSearchResults = usePromise(
    async (searchText, page) => {
      // Declare Swift Package Index Search Results
      let results: SwiftPackageIndexSearchResults;
      try {
        // Try to search for Swift Packages
        results = await SwiftPackageIndexService.search(searchText, page, abortable.current?.signal);
      } catch (error) {
        // Check if current search results are available
        if (searchResults.length) {
          // Use current search results to prevent clearing
          // existing search results on a page update
          return {
            results: searchResults,
            nextPage: page,
          };
        } else {
          // Otherwise rethrow error
          throw error;
        }
      }
      // Return search results
      return {
        results: searchResults.concat(results.results),
        nextPage: results.nextPage,
      };
    },
    [searchText, page],
    {
      abortable,
      onData: (searchResults) => {
        // Set search results
        setSearchResults(searchResults.results);
      },
    }
  );
  return (
    <List
      throttle
      isLoading={swiftPackageIndexSearchResults.isLoading}
      onSelectionChange={(id) => {
        if (
          swiftPackageIndexSearchResults.data?.nextPage &&
          swiftPackageIndexSearchResults.data?.results.at(-1)?.id === id
        ) {
          setPage(swiftPackageIndexSearchResults.data.nextPage);
        }
      }}
      searchBarPlaceholder="Search for Swift Packages"
      onSearchTextChange={(searchText) => {
        setPage(1);
        setSearchResults([]);
        setSearchText(searchText);
      }}
      isShowingDetail={!!swiftPackageIndexSearchResults.data?.results.length}
    >
      {swiftPackageIndexSearchResults.error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search failed"
          description="An error occurred while searching the Swift Package Index."
        />
      ) : (swiftPackageIndexSearchResults.isLoading && !swiftPackageIndexSearchResults.data?.results.length) ||
        !searchText.length ? (
        <List.EmptyView
          icon={swiftPackageIndexSearchResults.isLoading ? Icon.Hourglass : Icon.MagnifyingGlass}
          title={swiftPackageIndexSearchResults.isLoading ? "Searching" : "Search Swift Package Index"}
          description={
            swiftPackageIndexSearchResults.isLoading
              ? "Please wait..."
              : "Type something to search the Swift Package Index."
          }
        />
      ) : !swiftPackageIndexSearchResults.data?.results.length ? (
        <List.EmptyView title="No results" description={`No results could be found for "${searchText}"`} />
      ) : (
        swiftPackageIndexSearchResults.data?.results.map((searchResult) => (
          <SwiftPackageIndexListItem
            key={searchResult.id}
            searchResult={searchResult}
            isAddToXcodeActionVisible={isXcodeInstalled.data === undefined || isXcodeInstalled.data}
          />
        ))
      )}
    </List>
  );
}
