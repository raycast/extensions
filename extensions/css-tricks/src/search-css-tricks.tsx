import { useMemo, useState } from "react";

import { List } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";

import { ResultItem } from "@/types";

import { ListItem } from "@/components/list-item";

const Command = () => {
  const [query, setQuery] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const url = useMemo(() => {
    const searchParams = new URLSearchParams({
      search: query,
      per_page: "20",
      _fields: "id,title,url,type,subtype",
    });
    return `https://css-tricks.com/wp-json/wp/v2/search?${searchParams.toString()}`;
  }, [query]);

  const { data, isLoading, error } = useFetch(url, {
    mapResult(result: ResultItem[]) {
      return {
        data: result,
      };
    },
    execute: query.length > 0,
    keepPreviousData: false,
    onError(error) {
      showFailureToast("Failed to load data", error);
    },
  });

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search posts and pages"
      isShowingDetail={showDetails && query.length > 0}
    >
      {error && (
        <List.EmptyView title="Failed to load data" description={error.message} icon={{ source: "csstricks.svg" }} />
      )}
      {!error && !isLoading && query.length > 0
        ? data?.map((res) => (
            <ListItem
              key={res.id}
              item={res}
              toggleDetails={() => setShowDetails((s) => !s)}
              showDetails={showDetails && query.length > 0}
              toggleShowContent={() => setShowContent((s) => !s)}
              showContent={showContent}
            />
          ))
        : null}
      {!error && (
        <List.EmptyView
          title={
            query.length > 0
              ? isLoading
                ? "Loading data..."
                : "No results found"
              : "Start searching by typing in the search bar above"
          }
          icon={{ source: "csstricks.svg" }}
        />
      )}
    </List>
  );
};

export default Command;
