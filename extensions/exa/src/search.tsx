import { useState, useEffect, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  LocalStorage,
  Clipboard,
  getPreferenceValues,
  open,
} from "@raycast/api";
import { SearchResult } from "exa-js";
import exa from "./exa";
import { typeid } from "typeid-js";
import Fuse from "fuse.js";

// Constants
const STORAGE_KEY_PREFIX = "exa_search";

// Types
interface WebSearch {
  id: string;
  query: string;
  results: SearchResult<{ text: true }>[];
  metadata?: Record<string, string>;
  createdAt: Date;
}

interface Preferences {
  apiKey: string;
}

// Utility functions
function formatRelativeTime(date: Date): string {
  // Make sure we have a valid date
  if (!date || isNaN(date.getTime())) {
    return "unknown time";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  // For older dates, show the actual date
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Main Component
export default function Command() {
  // State
  const [searchText, setSearchText] = useState("");
  const [selectedSearch, setSelectedSearch] = useState<WebSearch | null>(null);
  const [allSearches, setAllSearches] = useState<WebSearch[]>([]);
  const [pendingSearches, setPendingSearches] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"searches" | "results">("searches");
  const [filteredResults, setFilteredResults] = useState<SearchResult<{ text: true }>[]>([]);
  const [resultsSearchText, setResultsSearchText] = useState("");

  // We don't need navigation pop since we're handling navigation with state

  // Get preferences once
  const preferences = getPreferenceValues<Preferences>();

  // Load all saved searches
  useEffect(() => {
    async function loadSavedSearches() {
      try {
        setIsLoading(true);
        const allItems = await LocalStorage.allItems();

        const searches: WebSearch[] = Object.entries(allItems)
          .filter(([key]) => key.startsWith(STORAGE_KEY_PREFIX))
          .map(([_, value]) => {
            const search = JSON.parse(value) as WebSearch;

            // Ensure createdAt is a proper Date object
            if (!search.createdAt) {
              // Default to now if missing
              search.createdAt = new Date();
            } else if (typeof search.createdAt === "string") {
              // Parse the date string into a Date object
              search.createdAt = new Date(search.createdAt);
            } else {
              // If it's an object but not a proper Date instance, convert it
              const timestamp =
                search.createdAt instanceof Date
                  ? search.createdAt.getTime()
                  : new Date(search.createdAt as any).getTime();
              search.createdAt = new Date(timestamp);
            }

            return search;
          });

        // Sort by timestamp (newest first)
        searches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setAllSearches(searches);
      } catch (error) {
        console.error("Error loading saved searches:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load saved searches",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadSavedSearches();
  }, []);

  // Update filtered results when selected search or results search text changes
  useEffect(() => {
    if (selectedSearch?.results) {
      if (!resultsSearchText) {
        setFilteredResults(selectedSearch.results);
        return;
      }

      // Use Fuse.js for fuzzy searching
      const fuse = new Fuse(selectedSearch.results, {
        keys: ["title", "text", "url"],
        threshold: 0.4,
        includeScore: true,
      });

      const searchResults = fuse.search(resultsSearchText);
      setFilteredResults(searchResults.map((result) => result.item));
    }
  }, [selectedSearch, resultsSearchText]);

  // We'll handle navigation using the actionPanel back action instead of keyboard events

  // Perform a new search
  const performSearch = useCallback(
    async (query: string): Promise<void> => {
      if (!query.trim()) return;

      const finalQuery = query.trim();
      const id = typeid(STORAGE_KEY_PREFIX).toString();

      // Create search object with current timestamp
      const currentTime = new Date();
      const newSearch: WebSearch = {
        id,
        query: finalQuery,
        results: [],
        createdAt: currentTime,
      };

      // Add to pending searches
      setPendingSearches((prev) => ({ ...prev, [id]: true }));

      // Add to state immediately and select it
      setAllSearches((prev) => [newSearch, ...prev]);
      setSelectedSearch(newSearch);
      setViewMode("results");
      setResultsSearchText("");

      // Clear search text
      setSearchText("");

      // Show toast
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Searching with Exa...",
      });

      try {
        // Make API request
        const start = performance.now();
        const response = await exa.searchAndContents(finalQuery, {
          text: true,
          numResults: 20,
        });
        const latencyMs = performance.now() - start;

        // Update search with response
        const updatedSearch = {
          ...newSearch,
          results: response.results as SearchResult<{ text: true }>[],
          metadata: {
            latencyMs: latencyMs.toFixed(0),
            resultCount: response.results.length.toString(),
          },
        };

        // Update state with the response
        setAllSearches((prev) => prev.map((s) => (s.id === id ? updatedSearch : s)));
        setSelectedSearch(updatedSearch);
        setFilteredResults(updatedSearch.results);

        // Prepare for storage - convert Date to ISO string for proper serialization
        const searchToStore = {
          ...updatedSearch,
          createdAt: updatedSearch.createdAt.toISOString(),
        };

        // Save to local storage - ensure we're using a consistent key format
        console.log(`Saving search with ID: ${id}`);
        await LocalStorage.setItem(id, JSON.stringify(searchToStore));

        // Update toast
        toast.style = Toast.Style.Success;
        toast.title = "Search complete";
        toast.message = `${response.results.length} results in ${latencyMs.toFixed(0)}ms`;
      } catch (error) {
        console.error("Error searching:", error);

        // Remove from state if failed
        setAllSearches((prev) => prev.filter((s) => s.id !== id));
        setSelectedSearch(null);
        setViewMode("searches");

        // Show error toast
        toast.style = Toast.Style.Failure;
        toast.title = "Error searching";
        toast.message = error instanceof Error ? error.message : String(error);
      } finally {
        // Remove from pending searches
        setPendingSearches((prev) => {
          const newPending = { ...prev };
          delete newPending[id];
          return newPending;
        });
      }
    },
    [preferences],
  );

  // Delete a search
  const deleteSearch = useCallback(
    async (id: string): Promise<void> => {
      try {
        console.log(`Attempting to delete search with ID: ${id}`);

        // First update in-memory state
        setAllSearches((prev) => {
          const filtered = prev.filter((s) => s.id !== id);
          return filtered;
        });

        // Update selection if needed
        if (selectedSearch?.id === id) {
          setSelectedSearch(null);
          setViewMode("searches");
        }

        // Clear this specific item from storage
        try {
          // Get all items from storage first
          const allItems = await LocalStorage.allItems();

          // Look for the specific key that contains our ID
          for (const key of Object.keys(allItems)) {
            if (key === id) {
              console.log(`Found exact key match: ${key}`);
              await LocalStorage.removeItem(key);
            }
          }

          // Also try the prefixed version as fallback
          await LocalStorage.removeItem(`${STORAGE_KEY_PREFIX}_${id}`);
          await LocalStorage.removeItem(STORAGE_KEY_PREFIX + id);
        } catch (storageError) {
          console.error("Error accessing storage during delete:", storageError);
        }

        // Show success message - we show success even if storage fails, since UI state is updated
        await showToast({
          style: Toast.Style.Success,
          title: "Search removed from history",
        });
      } catch (error) {
        console.error("Error deleting search:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete search",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [selectedSearch],
  );

  // Handle clipboard copy
  const handleCopyText = useCallback(async (text: string) => {
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
    });
  }, []);

  // Open URL in browser
  const handleOpenURL = useCallback(async (url: string) => {
    await open(url);
  }, []);

  // Generate markdown for detail view
  const generateResultMarkdown = useCallback((result: SearchResult<{ text: true }>): string => {
    let md = `## ${result.title || "Untitled"}\n\n`;
    md += `URL: ${result.url}\n\n`;

    if (result.score) {
      md += `Relevance: ${result.score.toFixed(2)}\n\n`;
    }

    if (result.publishedDate) {
      md += `Published: ${new Date(result.publishedDate).toLocaleString()}\n\n`;
    }

    md += `---\n\n`;

    if (result.text) {
      md += result.text;
    } else {
      md += "_No content available_";
    }

    md += `\n\n[Open in Browser](${result.url})`;

    // Add minimal metadata at the bottom
    md += `\n\n${result.id}`;

    return md;
  }, []);

  // View a search's results
  const viewSearchResults = useCallback((search: WebSearch) => {
    setSelectedSearch(search);
    // If the search has results, select the first one to show detail view
    if (search.results && search.results.length > 0) {
      setFilteredResults(search.results);
    }
    setViewMode("results");
    setResultsSearchText("");
  }, []);

  // Back to search list
  const backToSearches = useCallback(() => {
    setViewMode("searches");
    setSelectedSearch(null);
    setResultsSearchText("");
  }, []);

  // Handle search bar submission
  const handleSubmit = useCallback(() => {
    if (searchText.trim()) {
      performSearch(searchText);
    }
  }, [searchText, performSearch]);

  // Filter searches based on search text
  const filteredSearches = allSearches.filter(
    (search) => !searchText.trim() || search.query.toLowerCase().includes(searchText.toLowerCase()),
  );

  // Render Results View
  if (viewMode === "results" && selectedSearch) {
    return (
      <List
        isLoading={isLoading || pendingSearches[selectedSearch.id]}
        searchBarPlaceholder="Filter results..."
        onSearchTextChange={setResultsSearchText}
        searchText={resultsSearchText}
        navigationTitle={`Results for "${selectedSearch.query}"`}
        isShowingDetail
        actions={
          <ActionPanel>
            <Action
              title="Back to Search History"
              icon={Icon.ArrowLeft}
              onAction={backToSearches}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            />
            <Action
              title="Search Again"
              icon={Icon.MagnifyingGlass}
              onAction={() => performSearch(selectedSearch.query)}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      >
        <List.Section title={`${filteredResults.length} Results`} subtitle={selectedSearch.query}>
          {filteredResults.map((result) => (
            <List.Item
              key={result.id}
              title={result.title || "Untitled"}
              icon={Icon.Document}
              accessories={[
                { text: formatRelativeTime(result.publishedDate ? new Date(result.publishedDate) : new Date()) },
              ]}
              detail={<List.Item.Detail markdown={generateResultMarkdown(result)} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={result.url} />
                  <Action
                    title="Copy URL"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={() => handleCopyText(result.url)}
                  />
                  {result.text && (
                    <Action
                      title="Copy Content"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onAction={() => handleCopyText(result.text || "")}
                    />
                  )}
                  <Action
                    title="Back to Search History"
                    icon={Icon.ArrowLeft}
                    onAction={backToSearches}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel>
              }
            />
          ))}
          {filteredResults.length === 0 && !pendingSearches[selectedSearch.id] && (
            <List.EmptyView
              icon={Icon.MagnifyingGlass}
              title="No results found"
              description={resultsSearchText ? "Try a different search term" : "No results for this query"}
            />
          )}
        </List.Section>
      </List>
    );
  }

  // Searches View (default)
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search the web with Exa..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      navigationTitle="Exa Search"
      actions={
        <ActionPanel>
          <Action title="Search" icon={Icon.MagnifyingGlass} onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      {/* New search item when there's text in the search bar */}
      {searchText.trim() && (
        <List.Item
          title={`Search for "${searchText}"`}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Search" icon={Icon.MagnifyingGlass} onAction={handleSubmit} />
            </ActionPanel>
          }
        />
      )}

      {/* History mode - show past searches */}
      <List.Section title="Recent Searches">
        {filteredSearches.map((search) => (
          <List.Item
            key={search.id}
            id={search.id}
            title={search.query}
            icon={pendingSearches[search.id] ? Icon.Clock : Icon.MagnifyingGlass}
            accessories={[
              { text: `ID: ${search.id.substring(0, 8)}...` },
              { text: search.results?.length > 0 ? `${search.results.length} results` : undefined },
              { text: formatRelativeTime(search.createdAt) },
            ]}
            actions={
              <ActionPanel>
                <Action title="View Results" icon={Icon.Eye} onAction={() => viewSearchResults(search)} />
                <Action
                  title="Search Again"
                  icon={Icon.MagnifyingGlass}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => performSearch(search.query)}
                />
                <Action
                  title="Copy Query"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={() => handleCopyText(search.query)}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => deleteSearch(search.id)}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {allSearches.length === 0 && !searchText.trim() && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search the web with Exa"
          description="Type your search query in the search bar and press Enter"
        />
      )}
    </List>
  );
}
