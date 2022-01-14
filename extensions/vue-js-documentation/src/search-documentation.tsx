import { List, showToast, ToastStyle } from "@raycast/api";
import { ReactElement, useState } from "react";
import { useAlgoliaSearch } from "./utils";
import SearchResultItem from "./components/SearchResultItem";
import { SearchResult } from "./types";

const index = "vuejs-v3";

export default function Main(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { searchResults, error, isLoading } = useAlgoliaSearch(index, searchText);

  if (error) {
    showToast(ToastStyle.Failure, "Failed to search V3 documentation", error);
  }

  return (
    <List searchBarPlaceholder="Search..." onSearchTextChange={setSearchText} isLoading={isLoading} throttle>
      {searchResults?.hits?.map((result: SearchResult) => (
        <SearchResultItem key={result.objectID} result={result} />
      ))}
    </List>
  );
}
