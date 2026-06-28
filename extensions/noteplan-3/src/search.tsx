import { getNoteCategory, getNoteIcon, getNoteTitle } from "./lib/note-utilities";
import { ActionPanel, List } from "@raycast/api";
import { useNoteList } from "./lib/hooks";
import { OpenNoteAction, SaveAsQuicklinkAction, ShowDetailsAction } from "./lib/components";

export default () => {
  const [notes] = useNoteList();

  return (
    <List navigationTitle="Search Notes" searchBarPlaceholder="Search your notes">
      {notes.map((note) => (
        <List.Item
          key={note.relativePath}
          title={getNoteTitle(note)}
          accessories={[{ text: getNoteCategory(note), icon: getNoteIcon(note) }]}
          actions={
            <ActionPanel>
              <ShowDetailsAction entry={note} />
              <OpenNoteAction entry={note} />
              <SaveAsQuicklinkAction entry={note} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
