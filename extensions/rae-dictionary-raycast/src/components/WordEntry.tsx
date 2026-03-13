import { ActionPanel, Action, List } from "@raycast/api";
import { WordDetail } from "./WordDetail";
import { WordEntry } from "../api/rae";

export function WordEntryFC({ wordEntry }: { wordEntry: WordEntry }) {
  return (
    <List.Item
      id={wordEntry.word}
      title={wordEntry.word}
      actions={
        <ActionPanel>
          <Action.Push title="View Details" target={<WordDetail wordEntry={wordEntry} />} />
          <Action.CopyToClipboard title="Copy Word" content={wordEntry.word} />
        </ActionPanel>
      }
    />
  );
}
