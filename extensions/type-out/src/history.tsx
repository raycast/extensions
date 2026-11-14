import { Action, ActionPanel, Clipboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { typeOutText } from "./typing";

type Entry = {
  text: string;
  offset: number;
};

const MAX_HISTORY_OFFSET = 5; // Clipboard.readText supports offsets 0–5

function previewOf(text: string): string {
  const firstLine = text.split("\n")[0].replace(/\s+/g, " ").trim();
  return firstLine.length > 80 ? firstLine.slice(0, 77) + "…" : firstLine;
}

export default function Command() {
  const { isLoading, data: entries } = usePromise(async () => {
    const found: Entry[] = [];
    for (let offset = 0; offset <= MAX_HISTORY_OFFSET; offset++) {
      const text = await Clipboard.readText({ offset });
      if (text && text.trim().length > 0) {
        found.push({ text, offset });
      }
    }
    return found;
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter recent clipboard entries"
    >
      <List.Section title="Recent Clipboard Text">
        {entries?.map((entry, index) => (
          <List.Item
            key={entry.offset}
            title={previewOf(entry.text)}
            subtitle={index === 0 ? "Newest" : `${entry.text.length} chars`}
            actions={
              <ActionPanel>
                <Action
                  title="Type Now"
                  onAction={() => typeOutText(entry.text)}
                />
              </ActionPanel>
            }
          />
        ))}
        {entries?.length === 0 && (
          <List.EmptyView title="No text entries in your clipboard history" />
        )}
      </List.Section>
    </List>
  );
}
