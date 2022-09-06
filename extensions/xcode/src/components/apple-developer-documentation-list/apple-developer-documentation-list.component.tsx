import { Icon, List } from "@raycast/api";
import { useRef, useState } from "react";
import { AppleDeveloperDocumentationService } from "../../services/apple-developer-documentation.service";
import { AppleDeveloperDocumentationListItem } from "./apple-developer-documentation-list-item.component";
import { usePromise } from "@raycast/utils";

/**
 * Apple Developer Documentation List
 */
export function AppleDeveloperDocumentationList(): JSX.Element {
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
  return (
    <List
      isLoading={appleDeveloperDocumentationEntries.isLoading}
      searchBarPlaceholder="Search in Apple Developer Documentation"
      throttle={true}
      onSearchTextChange={setSearchText}
    >
      {appleDeveloperDocumentationEntries.error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search failed"
          description="An error occurred while searching the Apple Developer Documentation."
        />
      ) : appleDeveloperDocumentationEntries.isLoading || !searchText || searchText.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Apple Developer Documentation"
          description="Type something to search the Apple Developer Documentation."
        />
      ) : appleDeveloperDocumentationEntries.data?.length === 0 ? (
        <List.EmptyView title="No results" description={`No results could be found for "${searchText}"`} />
      ) : (
        appleDeveloperDocumentationEntries.data?.map((entry) => {
          return <AppleDeveloperDocumentationListItem key={entry.url} entry={entry} />;
        })
      )}
    </List>
  );
}
