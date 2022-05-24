import {
  ActionPanel,
  List,
  getLocalStorageItem,
  setLocalStorageItem,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import { Date } from "sugar";

interface Note {
  id: string;
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
  modificationDate: boolean;
}

export default function Command() {
  const [state, setState] = useState<State>({
    notes: [],
    loading: true,
  });

  function parseNotes(result: string) {
    const lines = result.split("\n");

    const notes: Note[] = [];
    const processedNotes: string[] = [];
    let lastAccount = "";
    let lastFolder = "";
    let lastNote: Note | null = null;
    let atLeastOneId = false;

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
        case "id":
          lastNote = {
            id: value,
          } as Note;
          atLeastOneId = true; // to ensure any cached items have ids
          break;
        case "name":
          if (lastNote) {
            lastNote.name = value;
          }
          break;
        case "date":
          if (lastNote) {
            lastNote.date = parseDateString(value);
            lastNote.folder = lastFolder;
            lastNote.account = lastAccount;

            if (!processedNotes.includes(lastNote.id)) {
              notes.push(lastNote);
              processedNotes.push(lastNote.id);
            }
          }
          break;
      }
    }

    // if our cache/results don't have ids - it is the pre-id cache, and we need to not set state.
    if (!atLeastOneId) {
      return;
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

  function parseDateString(date: string): Date {
    date = date.replace(/([0-9]+).([0-9]+).([0-9]+)$/, "$1:$2:$3"); // fix for time format

    let parsedDate = Date.create(date);
    if (!Date.isValid(parsedDate)) {
      parsedDate = Date.create();

      if (preferences.modificationDate) {
        showToast(ToastStyle.Failure, "Invalid date format", `Date ${date} could not be parsed.`);
      }
    }

    return parsedDate;
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
        "set theNoteID to the id of theNote\n" +
        "set theNoteName to the name of theNote\n" +
        "set theNoteDate to the modification date of theNote\n" +
        'set output to output & "id: " & theNoteID & "\n"\n' +
        'set output to output & "name: " & theNoteName & "\n"\n' +
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
    await runAppleScript(`tell application "Notes" \nshow note "${state.notes[number].name}" \nend tell`);
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
          subtitle={note.date && preferences.modificationDate ? Date(note.date).relative().raw : ""}
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
