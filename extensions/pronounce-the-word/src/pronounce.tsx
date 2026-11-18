import { List, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { fetchWordData, WordData } from "./api";
import { getHistory, addToHistory, removeFromHistory, HistoryItem } from "./storage";
import { WordDetails } from "./WordDetails";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWord, setSelectedWord] = useState<WordData | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadHistory();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    const historyData = await getHistory();
    setHistory(historyData);
    setIsLoading(false);
  };

  const handleSearchWord = async (word: string) => {
    if (!word.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a word",
      });
      return;
    }

    // Abort any previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);
    setShowSuggestions(false);
    setSuggestions([]);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Looking up pronunciation...",
    });

    try {
      const result = await fetchWordData(word.trim(), signal);

      if (signal.aborted) return;

      if (result.success && result.data) {
        // Add to history
        await addToHistory(word.trim());
        const historyData = await getHistory();
        if (signal.aborted) return;
        setHistory(historyData);

        // Show word details
        setSelectedWord(result.data);

        toast.style = Toast.Style.Success;
        toast.title = "Word found!";
      } else {
        // Show error with suggestions
        toast.style = Toast.Style.Failure;
        toast.title = result.error || "Word not found";

        if (result.suggestions && result.suggestions.length > 0) {
          toast.message = "Check suggestions below";
          setSuggestions(result.suggestions);
          setShowSuggestions(true);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Search error:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to fetch word data";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteFromHistory = async (word: string) => {
    const options: Alert.Options = {
      title: "Remove from History",
      message: `Are you sure you want to remove "${word}" from history?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      await removeFromHistory(word);
      await loadHistory();
      await showToast({
        style: Toast.Style.Success,
        title: "Removed from history",
      });
    }
  };

  const handleBack = () => {
    setSelectedWord(null);
    setSearchText("");
    setShowSuggestions(false);
    setSuggestions([]);
  };

  if (selectedWord) {
    return <WordDetails wordData={selectedWord} onBack={handleBack} />;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type a word to learn its pronunciation..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText.trim() && (
        <List.Item
          key="search-query"
          title={`Search: "${searchText}"`}
          icon={Icon.MagnifyingGlass}
          accessories={[{ text: "Press Enter" }]}
          actions={
            <ActionPanel>
              <Action title="Look up Pronunciation" icon={Icon.Book} onAction={() => handleSearchWord(searchText)} />
            </ActionPanel>
          }
        />
      )}

      {showSuggestions && suggestions.length > 0 && (
        <List.Section title="Did you mean?">
          {suggestions.map((suggestion) => (
            <List.Item
              key={`suggestion-${suggestion}`}
              title={suggestion}
              icon={Icon.LightBulb}
              accessories={[{ text: "Suggested" }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Look up This Word"
                    icon={Icon.Book}
                    onAction={() => {
                      setSearchText(suggestion);
                      handleSearchWord(suggestion);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {history.length > 0 && (
        <List.Section title="Recent Searches" subtitle={`${history.length} word${history.length > 1 ? "s" : ""}`}>
          {history.map((item) => (
            <List.Item
              key={item.word}
              title={item.word}
              icon={Icon.Clock}
              accessories={[
                { date: new Date(item.timestamp), tooltip: "Last searched" },
                { icon: Icon.Trash, tooltip: "Press ⌃X to delete" },
              ]}
              actions={
                <ActionPanel>
                  <Action title="View Pronunciation" icon={Icon.Book} onAction={() => handleSearchWord(item.word)} />
                  <Action
                    title="Remove from History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDeleteFromHistory(item.word)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!searchText.trim() && history.length === 0 && (
        <List.EmptyView
          icon={Icon.Book}
          title="Learn to Pronounce Words"
          description="Type a word in the search bar to get started"
        />
      )}
    </List>
  );
}
