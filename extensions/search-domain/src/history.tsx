import {
  List,
  ActionPanel,
  Action,
  open,
  LocalStorage,
  showToast,
  Toast,
  Keyboard,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";

interface QueryHistory {
  id: number;
  domain: string;
  isAvailable: boolean;
  date: string;
  buyLink: string | null;
}
export default function HistoryCommand({ onBack }: { onBack?: () => void } = {}) {
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  // Default to newest-first for a more natural history view
  const [sortReverse, setSortReverse] = useState(true);

  // Load query history from local storage when component mounts
  useEffect(() => {
    async function loadHistory() {
      const savedHistory = await LocalStorage.getItem<string>("domain-search-history");
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory) as QueryHistory[];
          setQueryHistory(parsedHistory);
        } catch (error) {
          console.error("Failed to parse history data:", error);
        }
      }
      setIsLoading(false);
    }

    loadHistory();
  }, []);

  // Function to handle direct buy from history
  function handleHistoryBuy(historyBuyLink: string | null) {
    if (historyBuyLink) {
      open(historyBuyLink);
    }
  }

  // Delete a single history item
  async function deleteHistoryItem(id: number) {
    const updated = queryHistory.filter((q) => q.id !== id).map((q, idx) => ({ ...q, id: idx + 1 }));
    setQueryHistory(updated);
    try {
      await LocalStorage.setItem("domain-search-history", JSON.stringify(updated));
      await showToast({ style: Toast.Style.Success, title: "History Updated", message: "Item deleted" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to update history" });
      console.error("Failed to delete history item:", error);
    }
  }

  // Toggle sort order

  // Clear all history with confirmation
  async function clearHistory() {
    setQueryHistory([]);
    try {
      await LocalStorage.removeItem("domain-search-history");
      await showToast({ style: Toast.Style.Success, title: "History Cleared" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to clear history" });
      console.error("Failed to clear history:", error);
    }
  }

  // Sort history based on sortReverse state
  const sortedHistory = [...queryHistory].sort((a, b) => {
    if (sortReverse) {
      return b.id - a.id; // Descending order (newest first)
    } else {
      return a.id - b.id; // Ascending order (oldest first)
    }
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(newValue) => setSearchText(newValue)}
      searchBarAccessory={
        <List.Dropdown tooltip="Sort Order" storeValue={true} onChange={(value) => setSortReverse(value === "desc")}>
          <List.Dropdown.Item title="Oldest First" value="asc" />
          <List.Dropdown.Item title="Newest First" value="desc" />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          {onBack && <Action title="Back to Search" onAction={onBack} />}
          <ActionPanel.Section title="History">
            {queryHistory.length > 0 && (
              <Action
                title="Clear All History"
                onAction={clearHistory}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.RemoveAll}
              />
            )}

            {queryHistory.length === 0 && (
              <Action
                title="Search Domain"
                onAction={async () => {
                  try {
                    await launchCommand({ name: "search-domain", type: LaunchType.UserInitiated });
                  } catch (error) {
                    await showFailureToast({
                      title: "Failed to launch search",
                      message: error instanceof Error ? error.message : "Unknown error",
                    });
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            )}
          </ActionPanel.Section>
          <Action
            title="Send Feedback"
            onAction={() =>
              open("mailto:raycast_support@hsnsofts.com?subject=Domain Search Extension Feedback or Suggestion")
            }
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
          <Action
            title="Buy Me a Coffee"
            onAction={() => open("https://buymeacoffee.com/hsnsoft")}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    >
      {!isLoading && searchText === "" && sortedHistory.length === 0 ? (
        <List.EmptyView title="No History Yet" description="Search for domains to see your history here" />
      ) : (
        <List.Section title="Query History">
          {sortedHistory.map((query) => (
            <List.Item
              key={query.id}
              title={query.domain}
              subtitle={query.isAvailable ? "Available for purchase" : "Registered"}
              accessories={[
                { date: new Date(query.date) },
                { tag: { value: `#${query.id}`, color: query.isAvailable ? "#00FF00" : "#FF0000" } },
              ]}
              actions={
                <ActionPanel>
                  {query.isAvailable && <Action title="Purchase" onAction={() => handleHistoryBuy(query.buyLink)} />}
                  <Action
                    title="Open in Browser"
                    onAction={() => open(`https://${query.domain}`)}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                  <Action
                    title="Delete"
                    onAction={() => deleteHistoryItem(query.id)}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                  {queryHistory.length > 0 && (
                    <Action
                      title="Clear All History"
                      onAction={clearHistory}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
