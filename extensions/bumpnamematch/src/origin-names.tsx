import { Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import { scoreNameRecord } from "./lib/search-utils";
import { NameListItem } from "./name-list-item";
import { GenderDropdown, type GenderFilter } from "./gender-dropdown";
import { type FavoriteList } from "./lib/api";
import { type Name, type NamesResponse } from "./lib/types";

// Cap the no-query list so very large origins stay responsive; searching uses
// the full scored set (top results) regardless.
const BROWSE_LIMIT = 300;
const SEARCH_LIMIT = 50;

export function OriginNames({
  origin,
  initialGender,
  baseUrl,
  apiKey,
  lists,
}: {
  origin: string;
  initialGender: GenderFilter;
  baseUrl: string;
  apiKey?: string;
  lists: FavoriteList[];
}) {
  const [gender, setGender] = useState<GenderFilter>(initialGender);
  const [searchText, setSearchText] = useState("");

  const url =
    `${baseUrl}/api/names?origin=${encodeURIComponent(origin)}&limit=all&sortBy=name` +
    (gender ? `&gender=${gender}` : "");
  const { data, isLoading } = useFetch<NamesResponse>(url);
  const names = data?.names ?? [];

  // Same selection/scoring behavior as Search Names, scoped to this origin.
  const results = useMemo(() => {
    const query = searchText.trim();
    if (!query) {
      return [...names]
        .sort((a, b) => {
          const ra = a.currentRank ?? Infinity;
          const rb = b.currentRank ?? Infinity;
          if (ra !== rb) return ra - rb;
          return a.name.localeCompare(b.name);
        })
        .slice(0, BROWSE_LIMIT);
    }

    const scored: { name: Name; score: number }[] = [];
    for (const name of names) {
      const score = scoreNameRecord(name.name, name.meanings, query, name.currentRank, name.nicknames);
      if (score > 0) scored.push({ name, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, SEARCH_LIMIT).map((s) => s.name);
  }, [searchText, names]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle={`${origin} Names`}
      searchBarPlaceholder={`Search ${origin} names…`}
      searchBarAccessory={<GenderDropdown value={gender} onChange={setGender} />}
    >
      {!isLoading && results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? `No names found for "${searchText}"` : `No ${origin} names found`}
        />
      ) : (
        results.map((name) => (
          <NameListItem key={name.id} name={name} baseUrl={baseUrl} apiKey={apiKey} lists={lists} />
        ))
      )}
    </List>
  );
}
