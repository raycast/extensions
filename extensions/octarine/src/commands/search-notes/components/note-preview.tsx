import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { openNote } from "@lib/octarine";
import type { IndexedNote } from "@type/notes";
import { useNoteMarkdown } from "../hooks/use-note-markdown";

export function NoteSidebarPreview({ note }: { note: IndexedNote }) {
  const { markdown, isLoading } = useNoteMarkdown(note);

  return <List.Item.Detail isLoading={isLoading} markdown={markdown} />;
}

export function NotePreview({ note }: { note: IndexedNote }) {
  const workspace = note.folder.workspace;
  const { markdown, isLoading } = useNoteMarkdown(note);

  return (
    <Detail
      navigationTitle={note.title}
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Note in Octarine" onAction={() => void openNote(note.path, workspace.name)} />
        </ActionPanel>
      }
    />
  );
}
