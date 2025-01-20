import { Action, ActionPanel, List, getPreferenceValues, showToast, Toast, Icon } from "@raycast/api";
import { useState, ReactElement } from "react";
import fetch from "node-fetch";

type Preferences = {
  exaApiKey: string;
};

type ExaSearchResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  score: number;
  published_date?: string;
};

interface ExaSearchResponse {
  results: ExaSearchResult[];
}

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<ExaSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minQueryLength = 3;

  // Get preferences
  const preferences = getPreferenceValues<Preferences>();

  async function searchExa(query: string) {
    if (!query || query.trim().length < minQueryLength) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": preferences.exaApiKey,
        },
        body: JSON.stringify({
          query: query.trim(),
          num_results: 10,
          use_autoprompt: true,
          include_domains: [],
          exclude_domains: [],
          source_type: "search",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API error ${response.status}: ${errorBody}`);
      }

      const data = (await response.json()) as ExaSearchResponse;
      setResults(data.results || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      showToast(Toast.Style.Failure, "Search failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearchTextChange(newText: string) {
    setSearchText(newText);
    if (!newText.trim()) {
      setResults([]);
    }
  }

  const searchAction = (
    <Action
      title="Search"
      onAction={() => searchExa(searchText)}
      shortcut={{ modifiers: [], key: "return" }}
      icon={Icon.MagnifyingGlass}
    />
  );

  const docsAction = (
    <Action.OpenInBrowser
      title="View Exa Api Documentation"
      url="https://docs.exa.ai/reference/search"
      icon={Icon.Document}
    />
  );

  const mainActions = (
    <ActionPanel>
      <ActionPanel.Section>
        {searchAction}
        {docsAction}
      </ActionPanel.Section>
    </ActionPanel>
  );

  const resultActions = (url: string) => (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={url} />
        <Action.CopyToClipboard content={url} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "c" }} />
      </ActionPanel.Section>
    </ActionPanel>
  );

  const emptyView = error ? (
    <List.EmptyView icon={Icon.ExclamationMark} title="Error" description={error} />
  ) : (
    <List.EmptyView
      icon={Icon.MagnifyingGlass}
      title={
        !searchText.trim()
          ? "Enter your search terms"
          : searchText.trim().length < minQueryLength
          ? `Type at least ${minQueryLength} characters`
          : "Press ↵ to search"
      }
      description="Press ↵ to search"
    />
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Type and press ↵ to search with Exa AI..."
      throttle
      actions={mainActions}
    >
      {results.length === 0
        ? emptyView
        : results.map((item) => (
            <List.Item
              key={item.id}
              icon={Icon.Link}
              title={item.title}
              subtitle={item.snippet}
              accessories={[
                {
                  text: item.published_date ? new Date(item.published_date).toLocaleDateString() : undefined,
                },
              ]}
              actions={resultActions(item.url)}
            />
          ))}
    </List>
  );
}
