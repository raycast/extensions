import { Action, ActionPanel, List } from "@raycast/api";
import { useMemo } from "react";
import {
  formatDate,
  formatDictationMarkdown,
  getWordCount,
  summarize,
} from "../format";
import type { DictationEntry } from "../types";

type DictationListItemProps = {
  entry: DictationEntry;
};

export function DictationListItem({ entry }: DictationListItemProps) {
  return (
    <List.Item
      title={summarize(entry.text)}
      detail={<DictationDetail entry={entry} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Dictation"
            content={entry.text}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function DictationDetail({ entry }: DictationListItemProps) {
  const markdown = useMemo(
    () => formatDictationMarkdown(entry.text),
    [entry.text],
  );

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Created"
            text={formatDate(entry.createdAtMs)}
          />
          <List.Item.Detail.Metadata.Label
            title="Words"
            text={getWordCount(entry.text).toString()}
          />
          <List.Item.Detail.Metadata.Label
            title="Characters"
            text={entry.text.length.toString()}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
