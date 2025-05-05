// src/components/WordDetail.tsx
import { ActionPanel, Action, Detail } from "@raycast/api";
import { WordEntry } from "../api/rae";

interface WordDetailProps {
  wordEntry: WordEntry;
  showActions?: boolean;
}

export function WordDetail({ wordEntry, showActions = true }: WordDetailProps) {
  // Formatear los datos para mostrarlos en markdown
  const meanings = wordEntry.meanings.flatMap((meaning) =>
    meaning.senses.map((sense) => {
      const category = sense.category ? `*${sense.category}*` : "";
      return `${category} ${sense.meaning_number}. ${sense.description}`;
    }),
  );

  const markdown = `
  # ${wordEntry.word}
  
  ${meanings.join("\n\n")}
    `;

  return (
    <Detail
      markdown={markdown}
      actions={
        showActions ? (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copiar Palabra"
              content={wordEntry.word}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copiar Definición"
              content={meanings.join("\n\n")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
