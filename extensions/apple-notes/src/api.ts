import { runAppleScript } from "@raycast/utils";
import { escapeDoubleQuotes } from "./utils";

export async function createNote(text?: string) {
  if (!text) {
    return runAppleScript(`
    tell application "Notes"
      activate
      set newNote to make new note at folder "Notes"
      set selection to newNote
    end tell
    `);
  }

  return runAppleScript(`
    tell application "Notes"
      activate
      set newNote to make new note at folder "Notes"
      set body of newNote to "${escapeDoubleQuotes(text)}"
      set selection to newNote
    end tell
    `);
}

export async function openNoteSeparately(id: string) {
  return runAppleScript(`
    tell application "Notes"
      set theNote to note id "${escapeDoubleQuotes(id)}"
      set theFolder to container of theNote
      show theFolder
      show theNote with separately
      activate
    end tell
    `);
}

export async function deleteNoteById(id: string) {
  return runAppleScript(`
    tell application "Notes"
      delete note id "${escapeDoubleQuotes(id)}"
    end tell
    `);
}

export async function restoreNoteById(id: string) {
  return runAppleScript(`
    tell application "Notes"
      set theNote to note id "${escapeDoubleQuotes(id)}"
      set theFolder to default folder of account 1
      move theNote to theFolder
    end tell
    `);
}
