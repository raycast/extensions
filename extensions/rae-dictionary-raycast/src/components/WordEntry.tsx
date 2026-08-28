import { ActionPanel, Action, List } from "@raycast/api";
import { WordDetail } from "./WordDetail";
import { WordEntry } from "../api/rae";
import { renderWordTags } from "./markdown";

export function WordEntryFC({ wordEntry }: { wordEntry: WordEntry }) {
  return (
    <List.Item
      id={wordEntry.word}
      title={wordEntry.word}
      accessories={renderWordTags(wordEntry).map((tag) => ({ tag }))}
      actions={
        <ActionPanel>
          <Action.Push title="View Details" target={<WordDetail wordEntry={wordEntry} />} />
          <Action.CopyToClipboard title="Copy Word" content={wordEntry.word} />
        </ActionPanel>
      }
    />
  );
}
