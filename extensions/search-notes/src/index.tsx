import {
  ActionPanel,
  List,
  getLocalStorageItem,
  setLocalStorageItem,
  closeMainWindow,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { parse } from "date-format-parse";

interface Note {
  name: string;
  date: Date | null;
  folder: string;
  account: string;
}

interface State {
  notes: Note[];
  loading: boolean;
  error?: Error;
}

interface Preferences {
  accounts: boolean;
  folders: boolean;
}

export default function Command() {
  const [state, setState] = useState<State>({
    notes: [],
    loading: true,
  });
  function parseNotes(result: string) {
    const lines = result.split("\n");

    const notes: Note[] = [];
    let lastAccount = "";
    let lastFolder = "";
    let lastNote: Note | null = null;

    for (const line of lines) {
      const [key, ...rest] = line.split(": ");
      const value = rest.join(": ");

      switch (key) {
        case "account":
          lastAccount = value;
          break;
        case "folder":
          lastFolder = value;
          break;
        case "note":
          lastNote = {
            name: value,
            date: null,
          } as Note;
          break;
        case "date":
          if (lastNote) {
            lastNote.date = parse(value, "dddd, D MMMM YYYY at HH:mm:ss");
            lastNote.folder = lastFolder;
            lastNote.account = lastAccount;
            notes.push(lastNote);
          }
          break;
      }
    }

    notes.sort((a, b) => (a.date && b.date && a.date < b.date ? 1 : -1));
    setState({ notes: notes, loading: false });
  }
  async function checkCachedNotes() {
    const cachedNotes = (await getLocalStorageItem("notes")) as string;
    if (cachedNotes) {
      parseNotes(cachedNotes);
    }
  }
  async function fetchItems() {
    const result = await runAppleScript(
      'set output to ""\n' +
        'tell application "Notes"\n' +
        "repeat with theAccount in every account\n" +
        "set theAccountName to the name of theAccount\n" +
        'set output to output & "account: " & theAccountName & "\n"\n' +
        "repeat with theFolder in every folder in theAccount\n" +
        "set theFolderName to the name of theFolder\n" +
        'set output to output & "folder: " & theFolderName & "\n"\n' +
        "repeat with theNote in every note in theFolder\n" +
        "set theNoteName to the name of theNote\n" +
        "set theNoteDate to the modification date of theNote\n" +
        'set output to output & "note: " & theNoteName & "\n"\n' +
        'set output to output & "date: " & theNoteDate & "\n"\n' +
        "end repeat\n" +
        "end repeat\n" +
        "end repeat\n" +
        "end tell\n" +
        "return output"
    );
    parseNotes(result);

    await setLocalStorageItem("notes", result);
  }
  async function openNote(number: number) {
    await closeMainWindow();
    await runAppleScript(
      'tell application "Notes" \n' + 'show note "' + state.notes[number].name + '" \n' + "end tell"
    );
  }

  useEffect(() => {
    fetchItems();
    checkCachedNotes();
  }, []);

  const preferences: Preferences = getPreferenceValues();

  return (
    <List isLoading={state.loading}>
      {state.notes.map((note, i) => (
        <List.Item
          key={i}
          icon="notes-icon.png"
          title={note.name}
          accessoryTitle={
            preferences.accounts
              ? preferences.folders
                ? note.account + " -> " + note.folder
                : note.account
              : preferences.folders
              ? note.folder
              : ""
          }
          actions={
            <ActionPanel title="Actions">
              <ActionPanel.Item title="Open in Notes" icon={Icon.TextDocument} onAction={() => openNote(i)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
