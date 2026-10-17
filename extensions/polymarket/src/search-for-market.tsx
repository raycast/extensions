import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { Ticker } from "./features/markets/types";
import { EventListItem } from "./features/markets/components/MarketList";
import { POLY_URL } from "./utils/constants";
import { parseSearchResponse, parseFetchResponse } from "./api/markets";

/**
 * Main Raycast Command Entry Point for: "Search for Market"
 *
 * This component acts as the primary orchestrator that mounts when the user runs the "Search Polymarket"
 * command from the Raycast launcher. It manages the global search state, queries the centralized Polymarket APIs
 * based on input strings, and renders the initial list of EventTickers.
 *
 * @returns {JSX.Element} The foundational Raycast `List` view containing the populated `EventListItem`s.
 */
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
        {data?.map((ticker: Ticker) => <EventListItem key={ticker.slug} ticker={ticker} />)}
      </List.Section>
    </List>
  );
}
