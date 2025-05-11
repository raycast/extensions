import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";
import { Ticker } from "./types";
import { EventListItem } from "./common";
import { POLY_REST_URL } from "./constants";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch(
    POLY_REST_URL +
      "events/global?" +
      new URLSearchParams({ q: searchText.length === 0 ? "" : searchText, events_status: "active" }),
    {
      parseResponse: parseFetchResponse,
    },
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search Polymarket..." throttle>
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((ticker) => <EventListItem key={ticker.slug} ticker={ticker} />)}
      </List.Section>
    </List>
  );
}

async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as { events?: Ticker[] } | [] | { error: string };

  if (!response.ok || "error" in json) {
    throw new Error("error" in json ? json.error : response.statusText);
  }

  return "events" in json ? json.events : [];
}
