import { getNoteCategory, getNoteIcon, getNoteTitle } from "./lib/note-utilities";
import { ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useNoteList } from "./lib/hooks";
import { NoteDetail, OpenNoteAction } from "./lib/components";

export default () => {
  const [notes] = useNoteList();
  const { push } = useNavigation();

  return (
    <List navigationTitle="Search Notes" searchBarPlaceholder="Search your notes">
      {notes.map((note) => (
        <List.Item
          key={note.relativePath}
          title={getNoteTitle(note)}
          accessories={[{ text: getNoteCategory(note), icon: getNoteIcon(note) }]}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Show Details"
                onAction={() => push(<NoteDetail entry={note} />)}
                icon={Icon.Eye}
              />
              <OpenNoteAction entry={note} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
