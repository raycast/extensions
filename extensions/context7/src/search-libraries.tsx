import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { LibraryListItem } from "./components/library-list-item";
import { searchLibraries } from "./lib/context7";
import { isAbortError, showErrorToast } from "./lib/error-utils";
import { getMyLibraries } from "./lib/my-libraries";
import { LIBRARY_SORT_OPTIONS, sortLibraries, type LibrarySort } from "./lib/library-sort";
import type { LibrarySummary, SavedLibrary } from "./lib/types";

const SEARCH_DEBOUNCE_MS = 250;

/** Shown before the user types, so the first screen is a starting point rather than an empty box. */
const SUGGESTED_SEARCHES = ["raycast", "react", "next.js", "tailwind", "typescript", "supabase"];

export default function SearchLibrariesCommand() {
  const [searchText, setSearchText] = useState("");
  const [libraries, setLibraries] = useState<SavedLibrary[]>([]);
  const [results, setResults] = useState<LibrarySummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [sort, setSort] = useState<LibrarySort>("relevance");
  const [wasFiltered, setWasFiltered] = useState(false);
  /** The query whose results are currently on screen. Anything else means a search is in flight. */
  const [settledQuery, setSettledQuery] = useState("");

  useEffect(() => {
    void refreshLibraries();
  }, []);

  useEffect(() => {
    const trimmedSearchText = searchText.trim();

    if (!trimmedSearchText) {
      setResults([]);
      setErrorMessage(undefined);
      setSettledQuery("");
      setIsLoading(false);
      return;
    }

    // Set before the debounce, not inside it: for the first 250 ms there is no request yet,
    // and leaving isLoading false there is what let the empty state flash "No Matching
    // Libraries" before the search had even been issued.
    setIsLoading(true);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        setErrorMessage(undefined);

        try {
          const result = await searchLibraries(trimmedSearchText, abortController.signal);
          setResults(result.libraries);
          setWasFiltered(result.searchFilterApplied);
          setSettledQuery(trimmedSearchText);
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }

          setResults([]);
          setSettledQuery(trimmedSearchText);
          setErrorMessage(await showErrorToast("Search Failed", error));
        } finally {
          setIsLoading(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [searchText]);

  const savedIds = useMemo(() => new Set(libraries.map((library) => library.id)), [libraries]);
  const hasQuery = searchText.trim().length > 0;
  // Covers the debounce window as well as the request itself, so the empty state never claims
  // "no results" for a query that has not been answered yet.
  const isSearchPending = hasQuery && settledQuery !== searchText.trim();
  const sortedResults = useMemo(() => sortLibraries(results, sort), [results, sort]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Context7 libraries..."
      searchBarAccessory={
        <List.Dropdown tooltip="Sort By" value={sort} storeValue onChange={(value) => setSort(value as LibrarySort)}>
          {LIBRARY_SORT_OPTIONS.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown>
      }
    >
      {!hasQuery ? (
        <>
          {/* Above the suggestions: a library you chose is a better starting point than a generic term. */}
          {libraries.length > 0 && (
            <List.Section title="My Libraries" subtitle={libraries.length.toString()}>
              {libraries.map((library) => (
                <LibraryListItem key={library.id} library={library} isSaved={true} onSavedChange={refreshLibraries} />
              ))}
            </List.Section>
          )}
          <List.Section title="Suggested Searches">
            {SUGGESTED_SEARCHES.map((suggestion) => (
              <List.Item
                key={suggestion}
                title={suggestion}
                icon={Icon.MagnifyingGlass}
                actions={
                  <ActionPanel>
                    <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => setSearchText(suggestion)} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      ) : (
        <List.Section title="Results" subtitle={sortedResults.length.toString()}>
          {sortedResults.map((library) => (
            <LibraryListItem
              key={library.id}
              library={library}
              isSaved={savedIds.has(library.id)}
              onSavedChange={refreshLibraries}
            />
          ))}
        </List.Section>
      )}

      <List.EmptyView
        icon={errorMessage ? Icon.Warning : Icon.MagnifyingGlass}
        title={isSearchPending ? "Searching Context7…" : getEmptyTitle(errorMessage, wasFiltered)}
        description={
          isSearchPending
            ? `Looking for “${searchText.trim()}”.`
            : getEmptyDescription(searchText, errorMessage, wasFiltered)
        }
        actions={
          <ActionPanel>
            {hasQuery && !isSearchPending ? (
              <>
                <Action.OpenInBrowser
                  title="Search on Context7"
                  icon={Icon.Globe}
                  url={`https://context7.com/?q=${encodeURIComponent(searchText.trim())}`}
                />
                <Action.OpenInBrowser
                  title="Add a Library to Context7"
                  icon={Icon.Plus}
                  url="https://context7.com/add-library"
                />
              </>
            ) : null}
          </ActionPanel>
        }
      />
    </List>
  );

  function getEmptyTitle(errorMessage: string | undefined, wasFiltered: boolean) {
    if (errorMessage) {
      return "Could Not Load Libraries";
    }

    return wasFiltered ? "Results Were Filtered" : "No Matching Libraries";
  }

  function getEmptyDescription(searchText: string, errorMessage: string | undefined, wasFiltered: boolean) {
    if (errorMessage) {
      return errorMessage;
    }

    if (wasFiltered) {
      return "Your Context7 teamspace policy filtered every result for this search.";
    }

    return `Context7 has nothing indexed for "${searchText.trim()}" — it may not be in the index yet.`;
  }

  async function refreshLibraries() {
    try {
      setLibraries(await getMyLibraries());
    } catch (error) {
      await showErrorToast("Could Not Load My Libraries", error);
    }
  }
}
