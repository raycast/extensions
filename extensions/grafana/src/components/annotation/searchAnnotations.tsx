import { ActionPanel, List, showToast, Toast } from "@raycast/api";
import { DeleteAnnotationAction, PatchAnnotationAction } from "./annotationActions";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";

import { annotationGetQuery } from "./queries";

// Zod schema for the raw annotation response from Grafana API
// Retrieved from https://grafana.com/docs/grafana/latest/developers/http_api/annotations/#find-annotations
const AnnotationResponseSchema = z.object({
  id: z.number(),
  alertId: z.number(),
  dashboardId: z.number(),
  dashboardUID: z.string().optional(),
  panelId: z.number(),
  userId: z.number(),
  userName: z.string().optional(),
  prevState: z.string().optional(),
  newState: z.string().optional(),
  time: z.number(),
  timeEnd: z.number().optional(),
  text: z.string().optional(),
  metric: z.string().optional(),
  tags: z.array(z.string()).nullable().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

interface SearchState {
  results: Annotation[];
  isLoading: boolean;
}

interface Annotation {
  id: number;
  alertId: number;
  dashboardId: number;
  dashboardUID?: string;
  panelId: number;
  userId: number;
  userName?: string;
  prevState?: string;
  newState?: string;
  time: number;
  timeEnd?: number;
  text?: string;
  metric?: string;
  tags?: string[] | null;
  data?: Record<string, unknown>;
  uniqueKey?: string;
}

export function SearchAnnotations() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search by name..." throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem
            key={
              searchResult.uniqueKey ||
              searchResult.id ||
              `annotation-${searchResult.time}-${searchResult.text?.slice(0, 10)}`
            }
            searchResult={searchResult}
          />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: Annotation }) {
  const humanReadableDate = new Date(searchResult.time).toLocaleString();
  return (
    <List.Item
      title={searchResult.text || searchResult.metric || "Annotation"}
      subtitle={searchResult.newState || searchResult.userName || ""}
      // subtitle={searchResult.tags?.join(" - ") || ""}
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
      if (error instanceof DOMException && error.name === "AbortError") {
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

  const rawData = await response.json();

  // Parse the response using Zod schema
  const parseResult = z.array(AnnotationResponseSchema).safeParse(rawData);

  if (!parseResult.success) {
    console.error("Failed to parse annotation response:", parseResult.error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to parse annotation data from Grafana API",
      message: JSON.stringify(parseResult.error),
    });
    return [];
  }

  const annotations = parseResult.data;

  return annotations
    .filter((annotation) => annotation.text || annotation.metric)
    .map((annotation, index) => {
      return {
        id: annotation.id,
        alertId: annotation.alertId,
        dashboardId: annotation.dashboardId,
        dashboardUID: annotation.dashboardUID,
        panelId: annotation.panelId,
        userId: annotation.userId,
        userName: annotation.userName,
        prevState: annotation.prevState,
        newState: annotation.newState,
        time: annotation.time,
        timeEnd: annotation.timeEnd,
        text: annotation.text,
        metric: annotation.metric,
        tags: annotation.tags,
        data: annotation.data,
        uniqueKey: `${annotation.id}-${annotation.time}-${index}`, // Create unique key
      };
    });
}
