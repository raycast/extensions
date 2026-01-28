import { List } from "@raycast/api";
import { useState } from "react";
import { PageListItem } from "./components/pageItem";
import { useCachedPromise } from "@raycast/utils";
import { searchPages } from "./notion/searchPage";

export function useSearchPages(query: string) {
  const res = useCachedPromise((query) => searchPages(query), [query], {
    keepPreviousData: true,
  });
  return res;
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const { data: searchPages, isLoading } = useSearchPages(searchText);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search pages"
      onSearchTextChange={setSearchText}
      throttle
      filtering
    >
      {searchPages?.map((p) => {
        return <PageListItem key={`${p.title}-${p.id}`} page={p} />;
      })}
      <List.EmptyView title="No pages found" />
    </List>
  );
}
