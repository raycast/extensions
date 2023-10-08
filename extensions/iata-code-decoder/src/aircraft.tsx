import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import { AbortSignal as NodeFetchAbortSignal } from "./types";
import { first } from "./utils";

export interface Aircraft {
  id: string;
  name: string;
  iataCode: string;
}

interface AircraftSearchState {
  results: Aircraft[];
  isLoading: boolean;
}

interface AircraftSearchSuccessResponse {
  data: Aircraft[];
}

interface AircraftSearchErrorResponse {
  data: {
    error: string;
  };
}

type AircraftSearchResponse = AircraftSearchSuccessResponse | AircraftSearchErrorResponse;

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Enter aircraft IATA code..."
      throttle
    >
      <List.Section title="Aircraft" subtitle={state.results.length + ""}>
        {state.results.map((aircraft) => (
          <AircraftListItem key={aircraft.id} aircraft={aircraft} />
        ))}
      </List.Section>
    </List>
  );
}

function AircraftListItem({ aircraft }: { aircraft: Aircraft }) {
  return (
    <List.Item
      title={aircraft.iataCode}
      subtitle={aircraft.name}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Name to Clipboard" content={aircraft.name} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch(): { state: AircraftSearchState; search: (text: string) => void } {
  const [state, setState] = useState<AircraftSearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();

      if (searchText === "") {
        return setState((oldState) => ({
          ...oldState,
          isLoading: false,
          results: [],
        }));
      }

      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await performSearch(searchText, cancelRef.current.signal);
        setState((oldState) => ({
          ...oldState,
          results: first(results, 50),
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

async function performSearch(searchText: string, signal: AbortSignal): Promise<Aircraft[]> {
  const params = new URLSearchParams();
  params.append("query", searchText);

  const response = await fetch("https://iata-code-decoder-api.timrogers.co.uk/aircraft" + "?" + params.toString(), {
    method: "get",
    // Typescript's idea of an AbortSignal and node-fetch's idea of an AbortSignal
    // don't seem to match. This handles it.
    signal: signal as NodeFetchAbortSignal,
  });

  const json = (await response.json()) as AircraftSearchResponse;

  if (!response.ok) {
    throw new Error(response.statusText);
  } else if ("error" in json.data) {
    throw new Error(json.data.error);
  } else {
    return json.data;
  }
}
