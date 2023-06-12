import { ActionPanel, Action, List } from "@raycast/api";
import { Word } from "./types";

export function WordListItem({ word }: { word: Word }) {
  return (
    <List.Item
      title={word.word}
      subtitle={word.desc}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              content={word.desc}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
