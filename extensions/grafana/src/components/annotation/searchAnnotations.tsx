/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: remove any types and be fully-type safe
import { ActionPanel, List, showToast, Toast } from "@raycast/api";
import { DeleteAnnotationAction, PatchAnnotationAction } from "./annotationActions";
import { useState, useEffect, useRef } from "react";
import { AbortError } from "node-fetch";

import { annotationGetQuery } from "./queries";

interface SearchState {
  results: Annotation[];
  isLoading: boolean;
}

interface Annotation {
  id?: number;
  alertId?: number;
  alertName?: string;
  dashboardId?: number;
  panelId?: number;
  userId?: number;
  prevState?: string;
  newState?: string;
  created?: number;
  updated?: number;
  time: number;
  timeEnd?: number;
  text: string;
  tags?: string[];
  login?: string;
  email?: string;
  avatarUrl?: string;
  data?: any;
}

export function SearchAnnotations(): JSX.Element {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search by name..." throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: Annotation }): JSX.Element {
  // console.log(searchResult)
  const humanReadableDate = new Date(searchResult.time).toLocaleString();
  return (
    <List.Item
      title={searchResult.text || (searchResult.alertName ? searchResult.alertName : "")}
      subtitle={searchResult.newState}
      // subtitle={searchResult.tags.join(" - ")}
      // accessoryTitle={searchResult.isStarred ? "⭐" : ""}
      accessoryTitle={humanReadableDate}
      actions={
        <ActionPanel>
          <PatchAnnotationAction annotation={searchResult} />
          <DeleteAnnotationAction annotation={searchResult} />
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");

    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  async function search(searchText: string) {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    try {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));

      const results = await performSearchOnAnnotations(searchText, cancelRef.current.signal);

      setState((oldState) => ({
        ...oldState,
        results: results,
        isLoading: false,
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }

      setState((oldState) => ({
        ...oldState,
        results: [],
        isLoading: false,
      }));
      console.error("search error", error);
      showToast(Toast.Style.Failure, "Could not perform search", String(error));
    }
  }

  return {
    state: state,
    search: search,
  };
}

async function performSearchOnAnnotations(searchText: string, signal: AbortSignal): Promise<Annotation[]> {
  const response = await annotationGetQuery(signal);

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  type Json = Record<string, unknown>;

  const annotations = (await response.json()) as Json[];

  return annotations
    .filter((annotation) => annotation.text || annotation.alertName)
    .map((annotation) => {
      // console.log(annotation);
      return {
        id: annotation.id as number,
        time: annotation.time as any,
        text: annotation.text as string,
        alertName: annotation.alertName as string,
        newState: annotation.newState as string,
      };
    });
}
