import { Note } from "@hackmd/api/dist/type";
import { ReactElement } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import NoteDetail from "./NoteDetail";

export default function NotesList({
  notes,
  isLoading,
  searchBarAccessory,
}: {
  notes?: Note[];
  isLoading: boolean;
  searchBarAccessory?: ReactElement<List.Dropdown.Props>;
}) {
  return (
    <List isLoading={isLoading} searchBarAccessory={searchBarAccessory}>
      {notes &&
        notes
          .sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())
          .map((note) => (
            <List.Item
              key={note.id}
              title={note.title}
              subtitle={note.tags?.join(", ")}
              icon={Icon.Document}
              accessories={[
                {
                  date: new Date(note.createdAt),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push target={<NoteDetail noteId={note.id} />} title="View Detail" />
                </ActionPanel>
              }
            />
          ))}
    </List>
  );
}
