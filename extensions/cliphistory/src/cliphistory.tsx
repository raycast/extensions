import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { Clipboard } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { ClipboardEntry } from "./interfaces/clipboardEntry.interface";
import { getHistoryFromStorage, updateStorageHistory } from "./utils/storage";
import { POLL_INTERVAL_MS } from "./constants";
import { formatPreview } from "./utils/format";
import { clearHistory, deleteEntry, removeLabel, toggleFavorite } from "./utils/actions";
import { LabelForm } from "./components/LabelForm";

export default function Command() {
  const [history, setHistory] = useState<ClipboardEntry[]>([]);

  useEffect(() => {
    getHistoryFromStorage().then(setHistory);

    const interval = setInterval(async () => {
      const text = await Clipboard.readText();
      if (!text) return;

      setHistory((prev) => {
        if (prev[0]?.content === text) return prev;
        if (prev.findIndex((e) => e.content === text) !== -1) return prev;

        const next = [{ id: randomUUID(), content: text, createdAt: Date.now(), favorite: false }, ...prev];
        const sorted = [...next].sort((a, b) => Number(b.favorite) - Number(a.favorite));
        updateStorageHistory(sorted);
        return sorted;
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <List searchBarPlaceholder="Search clipboard...">
      {history.map((entry) => (
        <List.Item
          key={entry.id}
          title={entry.label ? `🏷️ ${entry.label}` : formatPreview(entry.content)}
          subtitle={entry.label ? formatPreview(entry.content) : undefined}
          accessories={entry.favorite ? [{ icon: Icon.Heart, tooltip: "Favorite" }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Paste"
                icon={Icon.Clipboard}
                onAction={() => {
                  Clipboard.copy(entry.content);
                  Clipboard.paste(entry.content);
                }}
              />
              <Action
                title={entry.favorite ? "Unfavorite" : "Favorite"}
                icon={entry.favorite ? Icon.HeartDisabled : Icon.Heart}
                onAction={() => toggleFavorite(entry.id, history, setHistory)}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
              <Action.Push
                title={entry.label ? "Edit Label" : "Add Label"}
                icon={Icon.Tag}
                target={<LabelForm entry={entry} onSave={setHistory} />}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
              {entry.label && (
                <Action
                  title="Remove Label"
                  icon={Icon.Tag}
                  onAction={() => removeLabel(entry.id, history, setHistory)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                />
              )}
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteEntry(entry.id, history, setHistory)}
                shortcut={{ modifiers: ["shift"], key: "delete" }}
              />
              <Action
                title="Clear History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => clearHistory(history, setHistory)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
