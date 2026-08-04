import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getClient } from "./lib/preferences";
import { DocumentListItem } from "./components/document-list-item";
import type { SearchMode, SearchResponse } from "./lib/types";

const MODES: { id: SearchMode; name: string }[] = [
  { id: "hybrid", name: "Hybrid" },
  { id: "keyword", name: "Keyword" },
  { id: "semantic", name: "Semantic" },
];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [mode, setMode] = useState<SearchMode>("hybrid");
  const [showingDetail, setShowingDetail] = useState(true);

  const query = searchText.trim();
  const { isLoading, data } = useCachedPromise(
    (q: string, m: SearchMode) => getClient().request<SearchResponse>("GET", "/search", { query: { q, mode: m } }),
    [query, mode],
    { execute: query.length > 0, keepPreviousData: true },
  );

  const results = data?.results ?? [];

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your Granite vault…"
      throttle
      isShowingDetail={results.length > 0 && showingDetail}
      searchBarAccessory={
        <List.Dropdown tooltip="Search mode" value={mode} onChange={(v) => setMode(v as SearchMode)}>
          {MODES.map((m) => (
            <List.Dropdown.Item key={m.id} title={m.name} value={m.id} />
          ))}
        </List.Dropdown>
      }
    >
      {query.length === 0 ? (
        <List.EmptyView title="Search your vault" description="Type a query — try “2024 W-2” or “home insurance”." />
      ) : results.length === 0 ? (
        // Without an explicit EmptyView, a zero-child List shows Raycast's
        // generic "No Results" — which would flash mid-search while the request
        // is still in flight. Make it loading-aware instead.
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={isLoading ? "Searching…" : "No matches"}
          description={isLoading ? undefined : `Nothing in your vault matches “${query}”.`}
        />
      ) : (
        results.map((doc) => (
          <DocumentListItem
            key={doc.id}
            doc={doc}
            showingDetail={showingDetail}
            onToggleDetail={() => setShowingDetail((v) => !v)}
          />
        ))
      )}
    </List>
  );
}
