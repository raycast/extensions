// src/components/WordDetail.tsx
import { ActionPanel, Action, Detail, Keyboard } from "@raycast/api";
import { WordEntry } from "../api/rae";
import { renderMeanings, renderWordMarkdown } from "./markdown";

interface WordDetailProps {
  wordEntry: WordEntry;
  showActions?: boolean;
}

export function WordDetail({ wordEntry, showActions = true }: WordDetailProps) {
  return (
    <Detail
      markdown={renderWordMarkdown(wordEntry)}
      actions={
        showActions ? (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Word"
              content={wordEntry.word}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title="Copy Definition"
              content={renderMeanings(wordEntry)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
            <Action.OpenInBrowser
              title="Open in RAE Website"
              url={`https://dle.rae.es/${encodeURIComponent(wordEntry.word)}`}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
