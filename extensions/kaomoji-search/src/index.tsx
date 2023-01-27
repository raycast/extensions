import { ActionPanel, List, showToast, Action, Toast, getPreferenceValues, Grid } from "@raycast/api";
import { useState, useEffect, useRef, useMemo } from "react";
import { AbortError } from "node-fetch";
import { lib } from "asciilib";
import { nanoid } from "nanoid";

export default function Command() {
  const { state, search } = useSearch();
  const { displayMode } = getPreferenceValues<{ displayMode: "list" | "grid" }>();

  const displayGroupedResults = state.searchText.length === 0;
  const groupedResultsByCategory = useMemo(() => {
    const groupedResults: Record<string, SearchResult[]> = {};
    state.results.forEach((result) => {
      if (!groupedResults[result.category]) {
        groupedResults[result.category] = [];
      }
      groupedResults[result.category].push(result);
    });
    return groupedResults;
  }, [state.results]);

  const groupedResultsCategories = useMemo(() => {
    return Object.keys(groupedResultsByCategory).sort((a, b) => {
      if (a === "UNASSIGNED") {
        return 1;
      }

      if (b === "UNASSIGNED") {
        return -1;
      }

      return a.localeCompare(b);
    });
  }, [groupedResultsByCategory]);

  const ListComponent = displayMode === "list" ? List : Grid;
  const ItemComponent = displayMode === "list" ? SearchListItem : SearchGridItem;

  return (
    <ListComponent
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search by name..."
      throttle
    >
      {displayGroupedResults ? (
        groupedResultsCategories.map((category) => (
          <ListComponent.Section
            title={category}
            subtitle={groupedResultsByCategory[category].length + ""}
            key={category}
          >
            {groupedResultsByCategory[category].map((searchResult) => (
              <ItemComponent key={searchResult.id} searchResult={searchResult} />
            ))}
          </ListComponent.Section>
        ))
      ) : (
        <ListComponent.Section title="Results" subtitle={state.results.length + ""}>
          {state.results.map((searchResult) => (
            <ItemComponent key={searchResult.id} searchResult={searchResult} />
          ))}
        </ListComponent.Section>
      )}
    </ListComponent>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      accessories={[
        {
          text: searchResult.description,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Paste title="Paste in Active App" content={searchResult.name} />
            <Action.CopyToClipboard content={searchResult.name} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function toHTMLEntities(str: string) {
  return str.replace(/./gm, function (s) {
    return "&#" + s.charCodeAt(0) + ";";
  });
}

function getSvgWithKaomoji(kaomoji: string, dark = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 90 90">
  <text dominant-baseline="middle" x="45" y="45" text-anchor="middle" fill="${dark ? "#fff" : "#000"}" font-size="8px">
    ${toHTMLEntities(kaomoji)}
  </text>
</svg>`;
}

function getBase64SvgUrl(kaomoji: string, dark = false) {
  return "data:image/svg+xml;base64," + Buffer.from(getSvgWithKaomoji(kaomoji, dark)).toString("base64");
}

function SearchGridItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <Grid.Item
      content={{
        source: {
          dark: getBase64SvgUrl(searchResult.name, true),
          light: getBase64SvgUrl(searchResult.name, false),
        },
      }}
      title={searchResult.description}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Paste title="Paste in Active App" content={searchResult.name} />
            <Action.CopyToClipboard content={searchResult.name} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true, searchText: "" });
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
      const results = await performSearch(searchText, cancelRef.current.signal);
      setState((oldState) => ({
        ...oldState,
        results: results,
        isLoading: false,
        searchText,
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }
      console.error("search error", error);
      showToast(Toast.Style.Failure, "Could not perform search", String(error));
    }
  }

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  console.log("searching for", searchText);

  const results = await searchForResults(searchText);

  if (signal.aborted) {
    return Promise.reject(new AbortError());
  }

  console.log("results count", results.length);

  return results.map((entry: AsciiLibEntry) => {
    return {
      id: nanoid(),
      name: entry.entry as string,
      description: entry.name as string,
      category: entry.category,
    };
  });
}

interface AsciiLibEntry {
  name: string;
  entry: string;
  keywords: string[];
  category: string;
}

function searchForResults(keyword: string): Promise<AsciiLibEntry[]> {
  const lowercaseKeyword = keyword.toLowerCase();
  const database = Object.entries(lib).map((e) => e[1]) as AsciiLibEntry[];

  const filteredResults = database.filter((entry: AsciiLibEntry) => {
    return (
      entry.name.toLowerCase().includes(lowercaseKeyword) ||
      entry.keywords.some((keyword) => keyword.toLowerCase().includes(lowercaseKeyword)) ||
      entry.category.toLowerCase().includes(lowercaseKeyword)
    );
  });

  return Promise.resolve(filteredResults);
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
  searchText: string;
}

interface SearchResult {
  id: string;
  name: string;
  description: string;
  category: string;
}
