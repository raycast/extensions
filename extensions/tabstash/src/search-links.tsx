import { type LaunchProps, List } from "@raycast/api";
import { getAccessToken, useFetch, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { LinkListItem } from "./components/link-list-item";
import { provider } from "./provider";
import type { MeResponse, RecentResponse, SearchResponse } from "./types";

type SortOrder =
  | "newest"
  | "oldest"
  | "last-visited"
  | "alpha-asc"
  | "alpha-desc";

const SORT_OPTIONS: { label: string; value: SortOrder }[] = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Last Visited", value: "last-visited" },
  { label: "A\u2013Z", value: "alpha-asc" },
  { label: "Z\u2013A", value: "alpha-desc" },
];

function SearchLinks(props: LaunchProps<{ arguments: Arguments.SearchLinks }>) {
  const { token } = getAccessToken();
  const initialQuery = props.arguments.query || props.fallbackText || "";
  const [searchText, setSearchText] = useState(initialQuery);
  const [sort, setSort] = useState<SortOrder>("newest");

  const headers = { Authorization: `Bearer ${token}` };
  const isSearching = searchText.length > 0;

  // Fetch user profile once to detect AI feature availability
  const { data: meData } = useFetch<MeResponse>("https://tabsta.sh/v1/me", {
    headers,
  });

  // Recent bookmarks — fetched when search is empty
  const { data: recentData, isLoading: recentLoading } =
    useFetch<RecentResponse>(
      `https://tabsta.sh/v1/recent?limit=50&sort=${sort}`,
      {
        headers,
        execute: !isSearching,
        keepPreviousData: true,
      },
    );

  // Search — use hybrid mode when the server reports AI is enabled for this user
  const searchMode = meData?.ai_enabled ? "&mode=hybrid" : "";
  const { data: searchData, isLoading: searchLoading } =
    useFetch<SearchResponse>(
      `https://tabsta.sh/v1/search?q=${encodeURIComponent(searchText)}&format=full&limit=20${searchMode}`,
      {
        headers,
        execute: isSearching,
        keepPreviousData: true,
      },
    );

  const data = isSearching ? searchData : recentData;
  const isLoading = isSearching ? searchLoading : recentLoading;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search bookmarks..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
      searchBarAccessory={
        !isSearching ? (
          <List.Dropdown
            tooltip="Sort Order"
            defaultValue="newest"
            storeValue
            onChange={(v) => setSort(v as SortOrder)}
          >
            {SORT_OPTIONS.map((opt) => (
              <List.Dropdown.Item
                key={opt.value}
                title={opt.label}
                value={opt.value}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {data && data.items.length === 0 ? (
        <List.EmptyView
          title={isSearching ? "No results found" : "No bookmarks yet"}
          description={
            isSearching
              ? `No bookmarks matching "${searchText}"`
              : "Capture your first bookmark to get started"
          }
          icon="icon.png"
        />
      ) : (
        data?.items.map((item) => (
          <LinkListItem
            key={item.id}
            id={item.id}
            title={item.title}
            url={item.url}
            hostname={item.hostname}
            created_at={item.created_at}
            tags={item.tags}
            searchText={searchText}
          />
        ))
      )}
    </List>
  );
}

export default withAccessToken(provider)(SearchLinks);
