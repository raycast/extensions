import { List, ActionPanel, Action, Icon, getPreferenceValues, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { performSearch } from "./utils/search";
import { highlightMatch } from "./utils/highlight";

interface Preferences {
  braveSearchUrl?: string;
  maxHistoryItems?: string;
  defaultOpenMode?: string;
}

interface HistoryItem {
  query: string;
  timestamp: number;
}

const HISTORY_KEY = "brave-search-history";

// Date utility functions
function isToday(timestamp: number): boolean {
  const today = new Date();
  const date = new Date(timestamp);
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isThisWeek(timestamp: number): boolean {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return timestamp >= weekAgo;
}

function isThisMonth(timestamp: number): boolean {
  const today = new Date();
  const date = new Date(timestamp);
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function formatDate(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;

  // Less than 1 hour: "X minutes ago"
  if (diffMins < 60) {
    if (diffMins < 1) return "Just now";
    return `${diffMins} min ago`;
  }

  // Today: "Today, HH:MM"
  if (isToday(timestamp)) {
    return `Today, ${timeStr}`;
  }

  // Yesterday: "Yesterday, HH:MM"
  if (diffDays === 1) {
    return `Yesterday, ${timeStr}`;
  }

  // This week: "X days ago, HH:MM" or day name
  if (isThisWeek(timestamp)) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[date.getDay()];
    return `${dayName}, ${timeStr}`;
  }

  // This month: "DD Mon, HH:MM"
  if (isThisMonth(timestamp)) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    return `${day} ${month}, ${timeStr}`;
  }

  // Older: "DD Mon YYYY, HH:MM"
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}, ${timeStr}`;
}

async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const historyJson = await LocalStorage.getItem(HISTORY_KEY);
    if (historyJson) {
      const parsed = JSON.parse(historyJson as string);

      // Migration: Check if old format (string[]) and convert to new format
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (typeof parsed[0] === "string") {
          // Old format: convert to new format with current timestamp
          const migrated: HistoryItem[] = parsed.map((query: string) => ({
            query,
            timestamp: Date.now(),
          }));
          // Save migrated data
          await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(migrated));
          // Sort by timestamp descending (most recent first)
          return migrated.sort((a, b) => b.timestamp - a.timestamp);
        } else if (typeof parsed[0] === "object" && "query" in parsed[0] && "timestamp" in parsed[0]) {
          // New format: already migrated
          // Sort by timestamp descending (most recent first)
          return parsed.sort((a: HistoryItem, b: HistoryItem) => b.timestamp - a.timestamp);
        }
      }
    }
  } catch (error) {
    console.error("Error loading history:", error);
  }
  return [];
}

async function removeFromHistory(query: string): Promise<HistoryItem[]> {
  try {
    let history = await loadHistory();
    history = history.filter((item) => item.query !== query);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return history;
  } catch (error) {
    console.error("Error removing from history:", error);
    return [];
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today" | "this-week" | "this-month">("all");
  const preferences = getPreferenceValues<Preferences>();

  // URL de recherche Brave par défaut
  const searchUrl = preferences.braveSearchUrl || "https://search.brave.com/search?q=";
  const maxHistoryItems = parseInt(preferences.maxHistoryItems || "20", 10) || 20;
  const defaultOpenMode = (preferences.defaultOpenMode || "default") as "default" | "new-tab" | "new-window";

  // Load history on mount
  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  const handleSearch = async (query: string, openMode?: "default" | "new-tab" | "new-window") => {
    if (!query.trim()) return;

    // Use provided openMode or fall back to default preference
    const mode = openMode || defaultOpenMode;

    // Perform search using shared function
    await performSearch(query, searchUrl, maxHistoryItems, mode);

    // Update history for UI display
    const updatedHistory = await loadHistory();
    setHistory(updatedHistory);
  };

  const handleRemoveFromHistory = async (query: string) => {
    const updatedHistory = await removeFromHistory(query);
    setHistory(updatedHistory);
  };

  // Filter history by period
  function filterHistoryByPeriod(history: HistoryItem[], period: string): HistoryItem[] {
    if (period === "all") return history;
    if (period === "today") return history.filter((item) => isToday(item.timestamp));
    if (period === "this-week") return history.filter((item) => isThisWeek(item.timestamp));
    if (period === "this-month") return history.filter((item) => isThisMonth(item.timestamp));
    return history;
  }

  // Filter history to find matches with current search text
  // Prioritizes matches that start with the search text, then contains matches
  const getHistoryMatches = (): {
    startsWith: HistoryItem[];
    contains: HistoryItem[];
  } => {
    if (!searchText.trim()) return { startsWith: [], contains: [] };
    const lowerSearchText = searchText.toLowerCase();
    const trimmedSearchText = lowerSearchText.trim();

    // Separate matches into two categories: starts with and contains
    const startsWithMatches: HistoryItem[] = [];
    const containsMatches: HistoryItem[] = [];

    history.forEach((item) => {
      const lowerItem = item.query.toLowerCase();
      // Exclude exact matches
      if (lowerItem === trimmedSearchText) return;

      if (lowerItem.startsWith(trimmedSearchText)) {
        startsWithMatches.push(item);
      } else if (lowerItem.includes(trimmedSearchText)) {
        containsMatches.push(item);
      }
    });

    // Sort each category by timestamp (most recent first)
    startsWithMatches.sort((a, b) => b.timestamp - a.timestamp);
    containsMatches.sort((a, b) => b.timestamp - a.timestamp);

    // Limit each category: 5 for starts with, 3 for contains (total 8)
    return {
      startsWith: startsWithMatches.slice(0, 5),
      contains: containsMatches.slice(0, 3),
    };
  };

  const historyMatches = getHistoryMatches();
  const filteredHistory = filterHistoryByPeriod(history, filterPeriod);

  const getFilterLabel = (period: string): string => {
    switch (period) {
      case "today":
        return "Today";
      case "this-week":
        return "This Week";
      case "this-month":
        return "This Month";
      default:
        return "All";
    }
  };

  return (
    <List
      searchBarPlaceholder="Search in Brave..."
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action title="Search in Brave" icon={Icon.MagnifyingGlass} onAction={() => handleSearch(searchText)} />
          {!searchText && (
            <>
              <ActionPanel.Section title="Filter History">
                <Action
                  title="Show All"
                  icon={Icon.List}
                  onAction={() => setFilterPeriod("all")}
                  shortcut={{ modifiers: ["cmd"], key: "1" }}
                />
                <Action
                  title="Show Today"
                  icon={Icon.Calendar}
                  onAction={() => setFilterPeriod("today")}
                  shortcut={{ modifiers: ["cmd"], key: "2" }}
                />
                <Action
                  title="Show This Week"
                  icon={Icon.Clock}
                  onAction={() => setFilterPeriod("this-week")}
                  shortcut={{ modifiers: ["cmd"], key: "3" }}
                />
                <Action
                  title="Show This Month"
                  icon={Icon.Calendar}
                  onAction={() => setFilterPeriod("this-month")}
                  shortcut={{ modifiers: ["cmd"], key: "4" }}
                />
              </ActionPanel.Section>
            </>
          )}
        </ActionPanel>
      }
    >
      {searchText ? (
        <>
          <List.Item
            title={`Search "${searchText}" in Brave`}
            subtitle="Press Enter to launch the search"
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action title="Search in Brave" icon={Icon.MagnifyingGlass} onAction={() => handleSearch(searchText)} />
                <Action
                  title="Open in New Tab"
                  icon={Icon.Plus}
                  onAction={() => handleSearch(searchText, "new-tab")}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                />
                <Action
                  title="Open in New Window"
                  icon={Icon.Window}
                  onAction={() => handleSearch(searchText, "new-window")}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel>
            }
          />
          {(historyMatches.startsWith.length > 0 || historyMatches.contains.length > 0) && (
            <>
              {/* Starts with matches section */}
              {historyMatches.startsWith.length > 0 && (
                <>
                  {historyMatches.startsWith.map((item, index) => {
                    const highlightedTitle = highlightMatch(item.query, searchText);

                    return (
                      <List.Item
                        key={`starts-${index}`}
                        title={highlightedTitle}
                        subtitle={formatDate(item.timestamp)}
                        icon={Icon.MagnifyingGlass}
                        accessories={[
                          {
                            text: formatDate(item.timestamp),
                            tooltip: "Search date",
                          },
                          {
                            icon: Icon.XMarkCircle,
                            tooltip: "Remove from history",
                          },
                        ]}
                        actions={
                          <ActionPanel>
                            <Action
                              title="Search in Brave"
                              icon={Icon.MagnifyingGlass}
                              onAction={() => handleSearch(item.query)}
                              shortcut={{ modifiers: ["cmd"], key: "enter" }}
                            />
                            <Action
                              title="Open in New Tab"
                              icon={Icon.Plus}
                              onAction={() => handleSearch(item.query, "new-tab")}
                              shortcut={{ modifiers: ["cmd"], key: "t" }}
                            />
                            <Action
                              title="Open in New Window"
                              icon={Icon.Window}
                              onAction={() => handleSearch(item.query, "new-window")}
                              shortcut={{ modifiers: ["cmd"], key: "n" }}
                            />
                            <Action
                              title="Remove from History"
                              icon={Icon.XMarkCircle}
                              onAction={() => handleRemoveFromHistory(item.query)}
                              shortcut={{
                                modifiers: ["cmd"],
                                key: "backspace",
                              }}
                              style={Action.Style.Destructive}
                            />
                          </ActionPanel>
                        }
                      />
                    );
                  })}
                </>
              )}

              {/* Contains matches section */}
              {historyMatches.contains.length > 0 && (
                <>
                  {historyMatches.contains.map((item, index) => {
                    const highlightedTitle = highlightMatch(item.query, searchText);

                    return (
                      <List.Item
                        key={`contains-${index}`}
                        title={highlightedTitle}
                        subtitle={formatDate(item.timestamp)}
                        icon={Icon.Clock}
                        accessories={[
                          {
                            text: formatDate(item.timestamp),
                            tooltip: "Search date",
                          },
                          {
                            icon: Icon.XMarkCircle,
                            tooltip: "Remove from history",
                          },
                        ]}
                        actions={
                          <ActionPanel>
                            <Action
                              title="Search in Brave"
                              icon={Icon.MagnifyingGlass}
                              onAction={() => handleSearch(item.query)}
                              shortcut={{ modifiers: ["cmd"], key: "enter" }}
                            />
                            <Action
                              title="Open in New Tab"
                              icon={Icon.Plus}
                              onAction={() => handleSearch(item.query, "new-tab")}
                              shortcut={{ modifiers: ["cmd"], key: "t" }}
                            />
                            <Action
                              title="Open in New Window"
                              icon={Icon.Window}
                              onAction={() => handleSearch(item.query, "new-window")}
                              shortcut={{ modifiers: ["cmd"], key: "n" }}
                            />
                            <Action
                              title="Remove from History"
                              icon={Icon.XMarkCircle}
                              onAction={() => handleRemoveFromHistory(item.query)}
                              shortcut={{
                                modifiers: ["cmd"],
                                key: "backspace",
                              }}
                              style={Action.Style.Destructive}
                            />
                          </ActionPanel>
                        }
                      />
                    );
                  })}
                </>
              )}
            </>
          )}
        </>
      ) : filteredHistory.length > 0 ? (
        <>
          {filterPeriod !== "all" && (
            <List.Item
              title={`Filter: ${getFilterLabel(filterPeriod)} (${filteredHistory.length} items)`}
              subtitle="Press ⌘K to change filter"
              icon={Icon.Filter}
            />
          )}
          {filteredHistory.map((item, index) => (
            <List.Item
              key={index}
              title={item.query}
              subtitle={`Previous search • ${formatDate(item.timestamp)}`}
              icon={Icon.Clock}
              accessories={[
                {
                  icon: Icon.XMarkCircle,
                  tooltip: "Remove from history",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Search in Brave"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => handleSearch(item.query)}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  />
                  <Action
                    title="Open in New Tab"
                    icon={Icon.Plus}
                    onAction={() => handleSearch(item.query, "new-tab")}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                  <Action
                    title="Open in New Window"
                    icon={Icon.Window}
                    onAction={() => handleSearch(item.query, "new-window")}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title="Remove from History"
                    icon={Icon.XMarkCircle}
                    onAction={() => handleRemoveFromHistory(item.query)}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Start typing to search in Brave"
          description="Start typing to search in Brave"
        />
      )}
    </List>
  );
}
