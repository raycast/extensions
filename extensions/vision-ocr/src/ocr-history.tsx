import { Action, ActionPanel, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { VisionOCRDetail } from "./ocr";

const key = "ocr_history";
const limit = 10;

type HistoryEntry = {
  date: string;
  text: string;
};

export async function save_history(text: string) {
  if (!text.trim()) return;

  const entries = await read_history();
  entries.unshift({
    date: new Date().toISOString(),
    text,
  });
  await LocalStorage.setItem(key, JSON.stringify(entries.slice(0, limit)));
}

export async function read_history() {
  const value = await LocalStorage.getItem<string>(key);
  if (!value) return [];

  try {
    const entries = JSON.parse(value);
    return Array.isArray(entries) ? (entries as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export default function Command() {
  const [entries, set_entries] = useState<HistoryEntry[]>([]);
  const [is_loading, set_is_loading] = useState(true);

  useEffect(() => {
    read_history().then((entries) => {
      set_entries(entries);
      set_is_loading(false);
    });
  }, []);

  return (
    <List isLoading={is_loading} searchBarPlaceholder="Search OCR history...">
      {entries.map((entry) => {
        const preview = entry.text.replace(/\s+/g, " ").trim();
        const title =
          preview.length > 120 ? `${preview.slice(0, 120)}...` : preview;

        return (
          <List.Item
            key={entry.date}
            title={title}
            subtitle={new Date(entry.date).toLocaleString()}
            accessories={[{ text: `${entry.text.length} chars` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Text"
                  target={<VisionOCRDetail text={entry.text} />}
                />
                <Action.CopyToClipboard
                  title="Copy Text"
                  content={entry.text}
                />
                <Action.Paste title="Paste Text" content={entry.text} />
                <Action
                  title="Delete Entry"
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    const next_entries = entries.filter(
                      (item) => item.date !== entry.date,
                    );
                    await LocalStorage.setItem(
                      key,
                      JSON.stringify(next_entries),
                    );
                    set_entries(next_entries);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
