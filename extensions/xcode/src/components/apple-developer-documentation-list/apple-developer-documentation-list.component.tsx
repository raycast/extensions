import { Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { AppleDeveloperDocumentationEntry } from "../../models/apple-developer-documentation/apple-developer-documentation-entry.model";
import { AppleDeveloperDocumentationService } from "../../services/apple-developer-documentation.service";
import { AppleDeveloperDocumentationListItem } from "./apple-developer-documentation-list-item.component";

/**
 * Apple Developer Documentation List
 */
export function AppleDeveloperDocumentationList(): JSX.Element {
  // Use search text State
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  // Use XcodeDeveloperDocumentationEntries State
  const [appleDeveloperDocumentationEntries, setAppleDeveloperDocumentationEntries] = useState<
    AppleDeveloperDocumentationEntry[] | undefined
  >(undefined);
  // Use Error State
  const [error, setError] = useState<string>();
  // Use isLoading State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Initialize is cancelled bool value
  let isCancelled = false;
  // Use Effect
  useEffect(() => {
    async function search() {
      // Check if is cancelled
      if (isCancelled) {
        // Return out of function
        return;
      }
      // Check if search text is falsy
      if (!searchText) {
        // Disable is loading
        setIsLoading(false);
        // Clear Documentation Entries
        setAppleDeveloperDocumentationEntries(undefined);
        return;
      }
      // Enable is loading
      setIsLoading(true);
      // Clear error
      setError(undefined);
      try {
        // Search for Apple Developer Documentation Entries
        const entries = await AppleDeveloperDocumentationService.search(searchText);
        // Check if is not cancelled
        if (!isCancelled) {
          // Set Documentation Entries
          setAppleDeveloperDocumentationEntries(entries);
        }
      } catch (error) {
        // Check if is not cancelled
        if (!isCancelled) {
          // Set error
          setError(String(error));
        }
      } finally {
        // Check if is not cancelled
        if (!isCancelled) {
          // Disable is loading
          setIsLoading(false);
        }
      }
    }
    // Clear current Documentation Entries
    setAppleDeveloperDocumentationEntries(undefined);
    // Search
    search();
    return () => {
      // Enable is cancelled
      isCancelled = true;
    };
  }, [searchText]);
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search in Apple Developer Documentation"
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search failed"
          description="An error occurred while searching the Apple Developer Documentation."
        />
      ) : isLoading || !searchText || searchText.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Apple Developer Documentation"
          description="Type something to search the Apple Developer Documentation."
        />
      ) : appleDeveloperDocumentationEntries?.length === 0 ? (
        <List.EmptyView title="No results" description={`No results could be found for "${searchText}"`} />
      ) : (
        appleDeveloperDocumentationEntries?.map((entry) => {
          return <AppleDeveloperDocumentationListItem key={entry.url} entry={entry} />;
        })
      )}
    </List>
  );
}
