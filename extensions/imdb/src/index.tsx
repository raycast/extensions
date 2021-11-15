import { distance } from "fastest-levenshtein";
import { List } from "@raycast/api";
import { useState, useEffect } from "react";

import type { Title } from "./types";

import { getTitle } from "./api";
import { ListItem } from "./components/ListItem";

export default function SearchResults() {
  const [state, setState] = useState<{ titles: Title[] }>({ titles: [] });
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    async function fetch() {
      const result = await getTitle(search);

      if (result !== null) {
        // only add new results
        if (!state.titles.map((title) => title.imdbID).includes(result.imdbID)) {
          setState((previous) => ({
            titles: [result, ...previous.titles],
          }));
        }
      }
      setLoading(false);
    }
    if (search.length > 0) {
      fetch();
    }
  }, [search]);

  const onSearchChange = (newSearchTerm: string) => {
    if (newSearchTerm.length > 0) {
      setLoading(true);
      setSearch(newSearchTerm);
    }

    // backspace
    if (newSearchTerm.length < search.length) {
      setState({ titles: [] });
    }
  };

  const filterResults = [...new Set(state.titles)].filter((title) => {
    // if there are many results
    if (state.titles.length > 3) {
      // only include titles with relatively high similarities
      if (distance(search, title.Title) < 12) return true;
    } else {
      return true;
    }
  });

  const sortedResults = filterResults.sort((a, b) => {
    // if direct hit, order first
    if (a.Title.toLowerCase() === search.toLowerCase()) return -1;
    // if partial hit, order next
    if (a.Title.toLowerCase().includes(search.toLowerCase())) return -1;
    // otherwise order by cloest match
    return distance(search, a.Title) - distance(search, b.Title);
  });

  const latestResult = sortedResults.at(0);
  const restOfResults = sortedResults.slice(1, state.titles.length);

  return (
    <List
      isLoading={loading}
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder="Search IMDb for titles by name..."
      throttle
    >
      {latestResult ? (
        <List.Section
          title="Top Result"
          subtitle={`${latestResult.Type.charAt(0).toUpperCase() + latestResult.Type.slice(1)}`}
        >
          <ListItem title={latestResult} />
        </List.Section>
      ) : null}
      <List.Section title="Similar" subtitle={`${restOfResults.length} result(s)`}>
        {restOfResults.map((title) => (
          <ListItem key={title.imdbID} title={title} />
        ))}
      </List.Section>
    </List>
  );
}
