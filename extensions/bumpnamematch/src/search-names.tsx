import { Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import { scoreNameRecord } from "./lib/search-utils";
import { getPrefs } from "./lib/prefs";
import { useFavoriteLists } from "./lib/use-favorite-lists";
import { NameListItem } from "./name-list-item";
import { type Name, type NamesResponse } from "./lib/types";

const MAX_RESULTS = 30;

export default function Command() {
  const { baseUrl, apiKey } = getPrefs();
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useFetch<NamesResponse>(`${baseUrl}/api/names?limit=all&sortBy=name`);
  const lists = useFavoriteLists(baseUrl, apiKey);

  const allNames = data?.names ?? [];

  // Full-parity client-side scoring, mirroring components/global-search.tsx.
  const results = useMemo(() => {
    const query = searchText.trim();
    if (!query) {
      // No query: surface the most popular ranked names as a starting point.
      return [...allNames]
        .filter((n) => n.currentRank != null)
        .sort((a, b) => (a.currentRank ?? Infinity) - (b.currentRank ?? Infinity))
        .slice(0, MAX_RESULTS);
    }

    const scored: { name: Name; score: number }[] = [];
    for (const name of allNames) {
      const score = scoreNameRecord(name.name, name.meanings, query, name.currentRank, name.nicknames);
      if (score > 0) scored.push({ name, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_RESULTS).map((s) => s.name);
  }, [searchText, allNames]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search names or meanings…"
      throttle
    >
      {!isLoading && results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? `No names found for "${searchText}"` : "Type to search names or meanings"}
        />
      ) : (
        results.map((name) => (
          <NameListItem key={name.id} name={name} baseUrl={baseUrl} apiKey={apiKey} lists={lists} />
        ))
      )}
    </List>
  );
}
