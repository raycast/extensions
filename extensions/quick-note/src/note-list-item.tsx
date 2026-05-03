import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";

export type Note = {
  id: string;
  title: string;
  primaryTitle: string;
  favorite: boolean;
  plainContent: string;
  backgroundColor: Color;
  created: string;
  modified: string;
  folderName: string;
  folderId: string;
};

export function NoteListItem({ note }: { note: Note }) {
  return (
    <List.Item
      icon={{ source: Icon.Circle, tintColor: note.backgroundColor }}
      title={note.primaryTitle !== "" ? note.primaryTitle : "<Empty Note>"}
      accessories={[{ text: note.modified }]}
      actions={
        <ActionPanel>
          <Action.Open title="Open Note" target={`quicknote://open-note?uuid=${note.id}`} />
        </ActionPanel>
      }
    />
  );
}
