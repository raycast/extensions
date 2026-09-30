import { runAppleScript } from "@raycast/utils";

import { escapeDoubleQuotes } from "../helpers";

export async function createNote(text?: string) {
  const escapedText = text ? escapeDoubleQuotes(text) : "";

  return runAppleScript(`
    tell application "Notes"
      activate
      set newNote to make new note
      if ("${escapedText}" is not "") then
        set body of newNote to "${escapedText}"
      end if
      set selection to newNote
      show newNote
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

// Default AppleScript timeout (10s) can expire when Notes.app isn't already
// running because macOS must launch and index the app before responding.
// 30s accommodates this cold-start delay for read/write operations.

export async function getNoteBody(id: string) {
  return runAppleScript(
    `
    tell application "Notes"
      set theNote to note id "${escapeDoubleQuotes(id)}"
      return body of theNote
    end tell
    `,
    { timeout: 30_000 },
  );
}

export async function getNotePlainText(id: string) {
  return runAppleScript(
    `
    tell application "Notes"
      set theNote to note id "${escapeDoubleQuotes(id)}"
      return plaintext of theNote
    end tell
    `,
    { timeout: 30_000 },
  );
}

export async function setNoteBody(id: string, body: string) {
  return runAppleScript(
    `
    tell application "Notes"
      set theNote to note id "${escapeDoubleQuotes(id)}"
      set body of theNote to "${escapeDoubleQuotes(body)}"
    end tell
    `,
    { timeout: 30_000 },
  );
}

export async function getSelectedNote() {
  return runAppleScript(`
    tell application "Notes"
      set selectedNotes to selection
      if (count of selectedNotes) is 0 then
        error "No note is currently selected"
      else
        set theNote to item 1 of selectedNotes
        return id of theNote
      end if
    end tell
  `);
}

export async function appendNoteBody(id: string, content: string) {
  return runAppleScript(
    `
    tell application "Notes"
      set theNote to note id "${escapeDoubleQuotes(id)}"
      set body of theNote to (body of theNote) & "${escapeDoubleQuotes(content)}"
    end tell
    `,
    { timeout: 30_000 },
  );
}

export async function moveNoteToFolder(id: string, folderName: string, accountName?: string) {
  const escapedFolderName = escapeDoubleQuotes(folderName);
  // Without an explicit account, require a single matching folder across accounts.
  const findFolder = accountName
    ? `set theFolder to folder "${escapedFolderName}" of account "${escapeDoubleQuotes(accountName)}"`
    : `
      set theFolder to missing value
      set matchingAccountNames to {}
      repeat with acc in accounts
        try
          set candidateFolder to folder "${escapedFolderName}" of acc
          copy (name of acc) to end of matchingAccountNames
          if theFolder is missing value then
            set theFolder to candidateFolder
          end if
        end try
      end repeat
      if (count of matchingAccountNames) is 0 then
        error "Folder \\"${escapedFolderName}\\" not found"
      end if
      if (count of matchingAccountNames) > 1 then
        set AppleScript's text item delimiters to ", "
        set matchingAccountsText to matchingAccountNames as text
        set AppleScript's text item delimiters to ""
        error "Folder \\"${escapedFolderName}\\" exists in multiple accounts (" & matchingAccountsText & "). Provide accountName."
      end if
    `;

  return runAppleScript(
    `
    tell application "Notes"
      set theNote to note id "${escapeDoubleQuotes(id)}"
      ${findFolder}
      move theNote to theFolder
    end tell
    `,
    { timeout: 30_000 },
  );
}

export async function getFolders() {
  return runAppleScript(
    `
    tell application "Notes"
      set output to {}
      repeat with acc in accounts
        repeat with fld in folders of acc
          copy ((name of acc) & "|" & (name of fld)) to end of output
        end repeat
      end repeat
      set AppleScript's text item delimiters to linefeed
      set resultText to output as text
      set AppleScript's text item delimiters to ""
      return resultText
    end tell
    `,
    { timeout: 30_000 },
  );
}
