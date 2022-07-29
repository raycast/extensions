import { List } from "@raycast/api";
import { useEffect, useState } from "react";

import type { BasicTitle, EnrichedTitle } from "./types";

import { getEnrichedTitle, getSearchResults } from "./api";
import { ListItem } from "./components/ListItem";

export default function SearchResults() {
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [titles, setTitles] = useState<EnrichedTitle[]>([]);

  useEffect(() => {
    async function fetch() {
      const data: BasicTitle[] | null = await getSearchResults(search);

      if (data !== null) {
        const sortOrder = data.map((result) => result.imdbID);

        data.map(async (title, i) => {
          const enrichedTitle = await getEnrichedTitle(title.imdbID);
          if (enrichedTitle !== null) {
            setTitles((previous) =>
              !previous.map((t) => t.imdbID).includes(enrichedTitle.imdbID)
                ? // if the enriched title isn't in the list, add it, and re-sort the list
                  [...previous, enrichedTitle].sort(
                    (a, b) =>
                      sortOrder.indexOf(a.imdbID) - sortOrder.indexOf(b.imdbID)
                  )
                : [...previous]
            );
          }

          if (i + 1 === data.length) {
            // all data has been enriched
            setTimeout(() => setLoading(false), 400);
          }
        });
      } else {
        // search was successful but returned no results
        setLoading(false);
      }
    }

    if (search.length > 0) {
      setLoading(true);
      setTitles([]);
      fetch();
    }
  }, [search]);

  const onSearchChange = (newSearch: string) => {
    // backspace
    if (newSearch.length < search.length) {
      setTitles([]);
    }
    setSearch(newSearch);
  };

  const uniqueResults = [...new Set(titles)];
  const bestMatch = uniqueResults.at(0);
  const similar = uniqueResults.slice(1, titles.length);

  return (
    <List
      throttle
      isLoading={loading}
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder="Search IMDb for titles by name..."
    >
      {!loading ? (
        <>
          {bestMatch ? (
            <List.Section
              title="Best Match"
              subtitle={`${
                bestMatch.Type.charAt(0).toUpperCase() + bestMatch.Type.slice(1)
              }`}
            >
              <ListItem title={bestMatch} />
            </List.Section>
          ) : null}
          <List.Section title="Similar" subtitle={`${titles.length} result(s)`}>
            {similar.map((title) => (
              <ListItem title={title} key={title.imdbID} />
            ))}
          </List.Section>
        </>
      ) : null}
    </List>
  );
}
