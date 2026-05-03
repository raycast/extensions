import { List } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { useEffect, useState } from "react";
import { Note, NoteListItem } from "./note-list-item";
import { escaped } from "./utils";

type Folder = {
  id: string;
  name: string;
};

export default function Command() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true); // starts true

  useEffect(() => {
    async function fetchNotes() {
      setIsLoading(true);
      try {
        const foldersResult = await runAppleScript('tell application "Quick Note" to get json of every folder');
        setFolders(JSON.parse("[" + foldersResult + "]"));

        const notesResult = await runAppleScript(`
          tell application "Quick Note"
            set results to search "${escaped(searchText)}"
            
            if (count of results) = 0 then
              return "[]"
            end if
            
            set result to ""
            repeat with n in results
              set result to result & "," & (json of n)
            end repeat
            set result to text 2 thru end of result as string -- remove the first comma
            set result to "[" & result & "]"
            return result
          end tell
          `);
        setNotes(JSON.parse(notesResult));
      } catch (error) {
        console.error("Failed to fetch notes:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNotes();
  }, [searchText]);

  function renderFlatNotesList(notes: Note[]) {
    return notes.map((note) => <NoteListItem note={note} key={note.id} />);
  }

  function renderSectionedNotesList(notes: Note[], folders: Folder[]) {
    return (
      <>
        <List.Section title="Favorite Notes">
          {notes
            .filter((note) => note.favorite)
            .map((note) => (
              <NoteListItem note={note} key={note.id} />
            ))}
        </List.Section>
        <List.Section title="Ungrouped">
          {notes
            .filter((note) => !note.favorite && note.folderName == null)
            .map((note) => (
              <NoteListItem note={note} key={note.id} />
            ))}
        </List.Section>
        {folders.map((folder) => (
          <List.Section title={folder.name} key={folder.id}>
            {notes
              .filter((note) => !note.favorite && note.folderId === folder.id)
              .map((note) => (
                <NoteListItem note={note} key={note.id} />
              ))}
          </List.Section>
        ))}
      </>
    );
  }

  function shouldRenderSectionedList(notes: Note[]) {
    // Sectioned list if there is at least one favorite note, or if there are folders with notes
    if (notes.filter((note) => note.favorite).length > 0) {
      return true;
    }
    if (notes.filter((note) => note.folderName != null).length > 0) {
      return true;
    }
    return false;
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search notes...">
      {shouldRenderSectionedList(notes) ? renderSectionedNotesList(notes, folders) : renderFlatNotesList(notes)}
    </List>
  );
}
