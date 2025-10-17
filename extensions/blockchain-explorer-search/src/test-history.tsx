import { List, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSearchHistory, SearchHistoryItem, addToHistory } from "./utils/storage";

export default function Command() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const loaded = await getSearchHistory();
        console.log("Loaded history:", loaded);
        setHistory(loaded);
        showToast({ title: "History Loaded", message: `${loaded.length} items` });
      } catch (error) {
        console.error("Error loading history:", error);
        showToast({ title: "Error", message: String(error) });
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, []);

  const addTestItem = async () => {
    const testItem: SearchHistoryItem = {
      id: `test-${Date.now()}`,
      query: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      type: "address",
      chainId: 1,
      chainName: "Ethereum",
      timestamp: Date.now(),
      url: "https://etherscan.io/address/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    };

    await addToHistory(testItem);
    const updated = await getSearchHistory();
    setHistory(updated);
    showToast({ title: "Test Added", message: `Now ${updated.length} items` });
  };

  return (
    <List isLoading={isLoading}>
      <List.Item
        title="Add Test History Item"
        subtitle="Click to add a test item"
        actions={<List.Item.Action title="Add Test" onAction={addTestItem} />}
      />
      {history.map((item) => (
        <List.Item
          key={item.id}
          title={item.query}
          subtitle={`${item.type} on ${item.chainName}`}
          accessories={[{ text: new Date(item.timestamp).toLocaleString() }]}
        />
      ))}
      {history.length === 0 && !isLoading && <List.EmptyView title="No history" description="History is empty" />}
    </List>
  );
}
