import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import { countryCodeEmoji } from "country-code-emoji";

interface City {
  name: string;
  id: string;
  iataCode: string;
  iataCountryCode: string;
}

export interface Airport {
  time_zone: string;
  name: string;
  longitude: number;
  latitude: number;
  id: string;
  icaoCode: string;
  iataCode: string;
  iataCountryCode: string;
  cityName: string;
  city: City | null;
}

interface AirportSearchState {
  results: Airport[];
  isLoading: boolean;
}

interface AirportSearchSuccessResponse {
  data: Airport[];
}

interface AirportSearchErrorResponse {
  data: {
    error: string;
  };
}

type AirportSearchResponse = AirportSearchSuccessResponse | AirportSearchErrorResponse;

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Enter airport IATA code..."
      throttle
    >
      <List.Section title="Airports" subtitle={state.results.length + ""}>
        {state.results.map((airport) => (
          <AirportListItem key={airport.id} airport={airport} />
        ))}
      </List.Section>
    </List>
  );
}

function AirportListItem({ airport }: { airport: Airport }) {
  return (
    <List.Item
      title={airport.iataCode}
      subtitle={airport.name}
      accessoryTitle={
        airport.cityName +
        ", " +
        regionNames.of(airport.iataCountryCode) +
        " " +
        countryCodeEmoji(airport.iataCountryCode)
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Google Maps"
              url={"http://maps.google.com/maps?q=" + airport.latitude + "," + airport.longitude}
            />
            <Action.CopyToClipboard
              title="Copy Name to Clipboard"
              content={airport.name}
              shortcut={{ key: "c", modifiers: ["cmd"] }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch(): { state: AirportSearchState; search: (text: string) => void } {
  const [state, setState] = useState<AirportSearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await performSearch(searchText, cancelRef.current.signal);
        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        if (error instanceof AbortError) {
          return;
        }

        console.error("Search error", error);
        showToast({ style: Toast.Style.Failure, title: "Oops! Something went wrong.", message: String(error) });
      }
    },
    [cancelRef, setState]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<Airport[]> {
  const params = new URLSearchParams();
  params.append("query", searchText);

  const response = await fetch("https://iata-code-decoder-api.herokuapp.com/airports" + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });

  const json = (await response.json()) as AirportSearchResponse;

  if (!response.ok) {
    throw new Error(response.statusText);
  } else if ("error" in json.data) {
    throw new Error(json.data.error);
  } else {
    return json.data;
  }
}
