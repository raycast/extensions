import { Action, ActionPanel, List } from "@raycast/api";
import { Response, useFetch } from "@raycast/utils";
import { useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useFetch(`https://bahn.expert/api/stopPlace/v1/search/${searchText}`, {
    parseResponse: parseFetchResponse,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search train stations..."
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem key={searchResult.evaNumber} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Browser"
              url={`https://bahn.expert/${encodeURIComponent(searchResult.name)}?lookahead=150&lookbehind=10`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as [result: SearchResult] | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : "response.statusText");
  }

  return json.map((result) => {
    return {
      name: result.name,
      stationId: result.stationId,
      evaNumber: result.evaNumber,
      uic: result.uic,
      ifopt: result.ifopt,
    } as SearchResult;
  });
}

export interface Wings {
  mediumId: string;
}

export interface Departure {
  o: string;
  initialDeparture: string;
  arrival: Arrival;
  currentStopPlace: CurrentStopPlace;
  scheduledDestination: string;
  id: string;
  rawId: string;
  mediumId: string;
  substitute: boolean;
  train: Train;
  messages: Messages;
  route: Route[];
  destination: string;
  platform: string;
  scheduledPlatform: string;
  initialStopPlace: string;
  productClass?: string;
}

export enum Transport {
  HIGH_SPEED_TRAIN = "HIGH_SPEED_TRAIN",
  INTERCITY_TRAIN = "INTERCITY_TRAIN",
  BUS = "BUS",
  REGIONAL_TRAIN = "REGIONAL_TRAIN",
  SHUTTLE = "SHUTTLE",
  INTER_REGIONAL_TRAIN = "INTER_REGIONAL_TRAIN",
  CITY_TRAIN = "CITY_TRAIN",
}

export interface Arrival {
  scheduledTime: string;
  time: string;
  platform: string;
  scheduledPlatform: string;
  hidden: boolean;
  cancelled: boolean;
  delay: number;
}

export interface CurrentStopPlace {
  name: string;
  evaNumber: string;
}

export interface Train {
  name: string;
  number: string;
  line: string;
  type: string;
  admin: string;
}

export interface Messages {
  delay: any[];
  qos: any[];
  him: any[];
}

export interface Route {
  name: string;
}

export interface SearchResult {
  evaNumber: string;
  name: string;
  availableTransports: string[];
  position: Position;
  ifopt: string;
  ril100?: string;
  stationId?: string;
  uic: string;
}

export interface Position {
  longitude: number;
  latitude: number;
}
