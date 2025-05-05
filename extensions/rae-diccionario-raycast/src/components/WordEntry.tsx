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
          <Action.Push title="Ver Detalles" target={<WordDetail wordEntry={wordEntry} />} />
          <Action.CopyToClipboard title="Copiar Palabra" content={wordEntry.word} />
        </ActionPanel>
      }
    />
  );
}
