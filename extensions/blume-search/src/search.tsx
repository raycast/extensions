import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import { createBlumeSearchClient, SearchSupersededError, type BlumeSearchClient } from "./blumeSearchClient.ts";
import { searchStateForApplicationChange, type SearchState } from "./searchLifecycle.ts";
import {
  ALL_SEARCH_CATEGORIES,
  blumeDeepLinkForResult,
  categoriesForFilter,
  resultSubtitle,
  SEARCH_CATEGORY_ICONS,
  SEARCH_CATEGORY_LABELS,
  type SearchCategoryFilter,
} from "./searchModel.ts";

export default function SearchBlume(): React.JSX.Element {
  const preferences = getPreferenceValues<Preferences>();
  const clientRef = useRef<BlumeSearchClient | null>(null);
  const [clientReady, setClientReady] = useState(false);
  const [deepLinkProtocol, setDeepLinkProtocol] = useState<"blume" | "blume-canary">("blume");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchCategoryFilter>("all");
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setClientReady(false);
    setState(searchStateForApplicationChange());
    void createBlumeSearchClient(preferences.application)
      .then((client) => {
        if (!active) {
          client.dispose();
          return;
        }
        clientRef.current = client;
        setDeepLinkProtocol(client.deepLinkProtocol);
        setClientReady(true);
        setState((previous) => ({ ...previous, isLoading: false, error: null }));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          results: [],
          isLoading: false,
          error: error instanceof Error ? error.message : "Could not start Blume search.",
        });
      });
    return () => {
      active = false;
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, [preferences.application]);

  useEffect(() => {
    let current = true;
    const normalizedQuery = query.trim();
    const client = clientRef.current;
    if (normalizedQuery.length < 2 || !clientReady || !client) {
      if (clientReady) setState({ results: [], isLoading: false, error: null });
      return () => {
        current = false;
      };
    }

    setState((previous) => ({ ...previous, isLoading: true, error: null }));
    void client
      .search({ query: normalizedQuery, categories: categoriesForFilter(filter) })
      .then((page) => {
        if (current) setState({ results: page.results, isLoading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!current || error instanceof SearchSupersededError) return;
        setState({
          results: [],
          isLoading: false,
          error: error instanceof Error ? error.message : "Blume search failed.",
        });
      });

    return () => {
      current = false;
    };
  }, [clientReady, filter, query]);

  const emptyTitle = state.error
    ? "Blume Search Is Unavailable"
    : query.trim().length < 2
      ? "Search Blume"
      : "No Results";
  const emptyDescription =
    state.error ??
    (query.trim().length < 2
      ? "Type at least two characters to search projects, conversations, messages, setup, and suggestions."
      : "Try another query or search all categories.");

  return (
    <List
      filtering={false}
      isLoading={state.isLoading}
      navigationTitle="Search Blume"
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search projects, messages, setup…"
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search Category"
          value={filter}
          onChange={(value) => setFilter(value as SearchCategoryFilter)}
          storeValue
        >
          <List.Dropdown.Item
            title="Everything"
            value="all"
            icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
          />
          {ALL_SEARCH_CATEGORIES.map((category) => (
            <List.Dropdown.Item
              key={category}
              title={SEARCH_CATEGORY_LABELS[category]}
              value={category}
              icon={SEARCH_CATEGORY_ICONS[category]}
            />
          ))}
        </List.Dropdown>
      }
    >
      {state.results.length === 0 ? (
        <List.EmptyView
          icon={state.error ? Icon.Warning : Icon.MagnifyingGlass}
          title={emptyTitle}
          description={emptyDescription}
          actions={
            state.error ? (
              <ActionPanel>
                <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : (
        state.results.map((result) => (
          <List.Item
            key={`${result.category}:${result.id}`}
            id={`${result.category}:${result.id}`}
            icon={SEARCH_CATEGORY_ICONS[result.category]}
            title={result.title}
            subtitle={resultSubtitle(result)}
            accessories={[
              { text: SEARCH_CATEGORY_LABELS[result.category] },
              ...(result.updatedAt > 0 ? [{ date: new Date(result.updatedAt) }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Open
                  title="Open in Blume"
                  target={blumeDeepLinkForResult(result, deepLinkProtocol)}
                  icon={Icon.AppWindow}
                />
                <Action.CopyToClipboard title="Copy Result" content={result.excerpt ?? result.title} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
