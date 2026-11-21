import { LaunchProps, List } from "@raycast/api";
import { useState } from "react";
import { PostFeedList } from "./components/post-feed-list";
import { SubmittedSearch, useSubmittedSearch } from "./components/submitted-search";
import { SearchSort } from "./lib/feeds";

const SORTS: SearchSort[] = ["Latest", "Top", "Photos", "Videos"];

export default function Command({
  arguments: { query },
  fallbackText,
}: LaunchProps<{ arguments: Arguments.SearchPosts }>) {
  const search = useSubmittedSearch("search-posts", fallbackText ?? query);
  const [sort, setSort] = useState<SearchSort>("Latest");
  const [submittedSort, setSubmittedSort] = useState(sort);
  const sortedSearch: SubmittedSearch = {
    ...search,
    isDirty: search.isDirty || (search.submitted !== "" && sort !== submittedSort),
    submit: () => {
      search.submit();
      setSubmittedSort(sort);
    },
    run: (recent) => {
      search.run(recent);
      setSubmittedSort(sort);
    },
  };
  return (
    <PostFeedList
      feed={{ kind: "search", query: search.submitted, sort: submittedSort, filters: {} }}
      search={sortedSearch}
      searchBarAccessory={
        <List.Dropdown tooltip="Sort" value={sort} onChange={(value) => setSort(value as SearchSort)}>
          {SORTS.map((option) => (
            <List.Dropdown.Item key={option} title={option} value={option} />
          ))}
        </List.Dropdown>
      }
    />
  );
}
