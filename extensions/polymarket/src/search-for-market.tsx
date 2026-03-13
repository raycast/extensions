import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { Ticker } from "./types";
import { EventListItem } from "./common";
import { POLY_URL } from "./constants";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch(
    searchText.length > 0
      ? `${POLY_URL}public-search?${new URLSearchParams({
          q: searchText,
          page: "1",
          limit_per_type: "25",
          type: "events",
          events_status: "active",
          sort: "volume_24hr",
        })}`
      : `${POLY_URL}events?${new URLSearchParams({
          limit: "25",
          active: "true",
          archived: "false",
          closed: "false",
          order: "volume24hr",
          ascending: "false",
          offset: "0",
        })}`,
    {
      parseResponse: searchText.length > 0 ? parseSearchResponse : parseFetchResponse,
    },
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search Polymarket..." throttle>
      <List.Section
        title={searchText.length > 0 ? "Search Results" : "Top Markets by 24h Volume"}
        subtitle={data?.length?.toString() || "0"}
      >
        {data?.map((ticker) => <EventListItem key={ticker.slug} ticker={ticker} />)}
      </List.Section>
    </List>
  );
}

async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as Ticker[] | { error: string };

  if (!response.ok || "error" in json) {
    throw new Error("error" in json ? json.error : response.statusText);
  }

  return json as Ticker[];
}

async function parseSearchResponse(response: Response) {
  const json = (await response.json()) as { events: Ticker[] } | { error: string };

  if (!response.ok || "error" in json) {
    throw new Error("error" in json ? json.error : response.statusText);
  }

  return json.events as Ticker[];
}
