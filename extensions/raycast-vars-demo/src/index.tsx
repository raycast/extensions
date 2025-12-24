import { Action, ActionPanel, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

const storageKey = "counter";

export default function Command() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const stored = await LocalStorage.getItem<number>(storageKey);
      if (!cancelled) {
        setCount(stored ?? 0);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateCount = async (next: number) => {
    setCount(next);
    await LocalStorage.setItem(storageKey, next);
  };

  if (count === null) {
    return <List isLoading />;
  }

  return (
    <List>
      <List.Item
        title={`Count: ${count}`}
        actions={
          <ActionPanel>
            <Action title="Increment" onAction={() => updateCount(count + 1)} />
            <Action title="Reset" onAction={() => updateCount(0)} />
          </ActionPanel>
        }
      />
    </List>
  );
}
