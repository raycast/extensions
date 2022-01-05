import { AppleDeveloperDocumentationEntry } from "../../models/apple-developer-documentation/apple-developer-documentation-entry.model";
import { List } from "@raycast/api";
import { appleDeveloperDocumentationListItem } from "./apple-developer-documentation-list-item.user-interface";

/**
 * Apple Developer Documentation List
 * @param appleDeveloperDocumentationEntries The AppleDeveloperDocumentationEntries
 * @param isLoading Bool value if is currently loading
 * @param onSearchTextChange The on search text change function
 */
export function appleDeveloperDocumentationList(
  appleDeveloperDocumentationEntries: AppleDeveloperDocumentationEntry[] | undefined,
  isLoading: boolean,
  onSearchTextChange: (searchTerm: string) => void
): JSX.Element {
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search in Apple Developer Documentation"
      onSearchTextChange={onSearchTextChange}
      throttle={true}
    >
      {appleDeveloperDocumentationEntries?.map(appleDeveloperDocumentationListItem)}
    </List>
  );
}
