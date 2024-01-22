import { Icon, List } from "@raycast/api";
import { useRef, useState } from "react";
import { AppleDeveloperDocumentationService } from "../../services/apple-developer-documentation.service";
import { AppleDeveloperDocumentationListItem } from "./apple-developer-documentation-list-item.component";
import { usePromise } from "@raycast/utils";
import { AppleDeveloperDocumentationEntryType } from "../../models/apple-developer-documentation/apple-developer-documentation-entry-type.model";
import { AppleDeveloperDocumentationListSearchBarAccessory } from "./apple-developer-documentation-list-search-bar-accessory.component";

/**
 * Apple Developer Documentation List
 */
export function AppleDeveloperDocumentationList() {
  // Use search text State
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  // Use AbortController reference
  const abortable = useRef<AbortController>();
  // Use Apple Developer Documentation Search Promise
  const appleDeveloperDocumentationEntries = usePromise(
    (searchText) => AppleDeveloperDocumentationService.search(searchText, abortable.current?.signal),
    [searchText],
    {
      abortable,
    }
  );
  // Use state for AppleDeveloperDocumentationEntryType filter
  const [entryTypeFilter, setEntryTypeFilter] = useState<AppleDeveloperDocumentationEntryType | undefined>(undefined);
  // Initialize filtered Apple Developer Documentation Entries
  const filteredAppleDeveloperDocumentationEntries = appleDeveloperDocumentationEntries.data
    ? entryTypeFilter
      ? appleDeveloperDocumentationEntries.data.filter((entry) => entry.type === entryTypeFilter)
      : appleDeveloperDocumentationEntries.data
    : undefined;
  return (
    <List
      throttle
      isLoading={appleDeveloperDocumentationEntries.isLoading}
      isShowingDetail={!!filteredAppleDeveloperDocumentationEntries?.length}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<AppleDeveloperDocumentationListSearchBarAccessory onChange={setEntryTypeFilter} />}
    >
      {appleDeveloperDocumentationEntries.error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search failed"
          description="An error occurred while searching the Apple Developer Documentation."
        />
      ) : appleDeveloperDocumentationEntries.isLoading || !searchText || searchText.length === 0 ? (
        <List.EmptyView
          icon={appleDeveloperDocumentationEntries.isLoading ? Icon.Hourglass : Icon.MagnifyingGlass}
          title={appleDeveloperDocumentationEntries.isLoading ? "Searching" : "Search Apple Developer Documentation"}
          description={
            appleDeveloperDocumentationEntries.isLoading
              ? "Please wait..."
              : "Type something to search the Apple Developer Documentation."
          }
        />
      ) : filteredAppleDeveloperDocumentationEntries?.length === 0 ? (
        <List.EmptyView title="No results" description={`No results could be found for "${searchText}"`} />
      ) : (
        filteredAppleDeveloperDocumentationEntries?.map((entry) => (
          <AppleDeveloperDocumentationListItem key={entry.url} entry={entry} />
        ))
      )}
    </List>
  );
}
