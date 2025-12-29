import {
  List,
  ActionPanel,
  Action,
  showHUD,
  closeMainWindow,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { list, loadHistory } from "./clipboard";
import { setClipboard } from "./utils";
import { start } from "./watcher";

type Entry = { text: string; timestamp: number };

export default function Command() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      await loadHistory();
      setEntries(list());
      setIsLoading(false);
      start();
    }
    init();
  }, []);

  async function handleRestore(text: string) {
    await setClipboard(text);
    await closeMainWindow();
    await showHUD("Restored to clipboard");
  }

  return (
    <List isLoading={isLoading}>
      {entries.map((e, i) => (
        <List.Item
          key={`${e.timestamp}-${i}`}
          title={
            e.text.length > 100 ? e.text.substring(0, 100) + "..." : e.text
          }
          subtitle={`#${i + 1}  |  ${new Date(e.timestamp).toLocaleTimeString()}`}
          actions={
            <ActionPanel>
              <Action
                title="Restore to Clipboard"
                onAction={() => handleRestore(e.text)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
