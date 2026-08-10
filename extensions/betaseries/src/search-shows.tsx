import { List } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import {
  buildBetaSeriesUrl,
  getHeaders,
  parseBetaSeriesResponse,
} from "./api/client";
import { Show } from "./types/betaseries";
import { ShowListItem } from "./components/ShowListItem";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const shouldSearch = searchText.trim().length > 0;

  const { data: items = [], isLoading } = useFetch<
    { shows: Show[] },
    Show[],
    Show[]
  >(buildBetaSeriesUrl("/shows/search", { title: searchText }), {
    headers: getHeaders(),
    execute: shouldSearch,
    keepPreviousData: shouldSearch,
    initialData: [],
    parseResponse: (response) =>
      parseBetaSeriesResponse<{ shows: Show[] }>(response),
    mapResult: (result) => ({ data: result.shows || [] }),
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search TV Shows..."
      throttle
    >
      {items.map((show) => (
        <ShowListItem key={show.id} show={show} />
      ))}
    </List>
  );
}
