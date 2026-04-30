import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import { version as extensionVersion } from "../package.json";

const PERPLEXITY_SEARCH_URL = "https://api.perplexity.ai/search";
const INTEGRATION_SLUG = "raycast";

type Preferences = {
  apiKey: string;
  maxResults?: string;
  country?: string;
  recency?: "any" | "hour" | "day" | "week" | "month" | "year";
};

type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
  date?: string;
  last_updated?: string;
};

type SearchResponse = {
  results: SearchResult[];
  id?: string;
  server_time?: string;
};

type Arguments = {
  query?: string;
};

function clampMaxResults(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return 10;
  if (n < 1) return 1;
  if (n > 20) return 20;
  return n;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const initialQuery = props.arguments?.query ?? "";
  const [query, setQuery] = useState(initialQuery);

  const trimmed = query.trim();
  const maxResults = clampMaxResults(preferences.maxResults);
  const country = preferences.country?.trim() || undefined;
  const recency = preferences.recency && preferences.recency !== "any" ? preferences.recency : undefined;

  const body = useMemo(() => {
    const payload: Record<string, unknown> = {
      query: trimmed,
      max_results: maxResults,
    };
    if (country) payload.country = country;
    if (recency) payload.search_recency_filter = recency;
    return JSON.stringify(payload);
  }, [trimmed, maxResults, country, recency]);

  const { isLoading, data, error, revalidate } = useFetch<SearchResponse>(PERPLEXITY_SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      "Content-Type": "application/json",
      "X-Pplx-Integration": `${INTEGRATION_SLUG}/${extensionVersion}`,
    },
    body,
    execute: trimmed.length > 0,
    keepPreviousData: true,
  });

  const results = data?.results ?? [];

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search the web with Perplexity…"
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search failed"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : trimmed.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search the web"
          description="Type a query to search with Perplexity."
        />
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No results" description={`No results for “${trimmed}”.`} />
      ) : (
        <List.Section title="Results" subtitle={results.length ? String(results.length) : undefined}>
          {results.map((item, idx) => {
            const host = hostnameOf(item.url);
            return (
              <List.Item
                key={`${item.url}-${idx}`}
                title={item.title || item.url}
                subtitle={item.snippet}
                accessories={[{ text: host }, ...(item.date ? [{ date: new Date(item.date) }] : [])]}
                icon={{ source: `https://www.google.com/s2/favicons?domain=${host}&sz=64`, fallback: Icon.Globe }}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={item.url} />
                    <Action.CopyToClipboard title="Copy URL" content={item.url} />
                    <Action.CopyToClipboard
                      title="Copy Title and URL"
                      content={`${item.title} — ${item.url}`}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    {item.snippet ? (
                      <Action.CopyToClipboard
                        title="Copy Snippet"
                        content={item.snippet}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                      />
                    ) : null}
                    <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
                    <Action
                      title="Open Extension Preferences"
                      icon={Icon.Gear}
                      shortcut={{ modifiers: ["cmd"], key: "," }}
                      onAction={openExtensionPreferences}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
