import { runAppleScript } from "@raycast/utils";

function escapeAppleScript(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeHTML(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function getNotePlainText(id: string) {
  return runAppleScript(
    `tell application "Notes"\n  return plaintext of note id "${escapeAppleScript(id)}"\nend tell`,
    { timeout: 30_000 },
  );
}

export async function createAppleNote(title: string, content: string, folderName?: string) {
  const body = `<h1>${escapeHTML(title)}</h1><div>${escapeHTML(content).replace(/\r?\n/g, "<br>")}</div>`;
  const targetFolder = folderName
    ? `
      set targetFolder to missing value
      set matchingFolders to {}
      repeat with accountItem in accounts
        repeat with folderItem in folders of accountItem
          if name of folderItem is "${escapeAppleScript(folderName)}" then set end of matchingFolders to contents of folderItem
        end repeat
      end repeat
      if (count of matchingFolders) is 0 then error "Folder not found: ${escapeAppleScript(folderName)}"
      if (count of matchingFolders) is greater than 1 then error "Multiple folders have this name. Use a unique folder name before creating a note."
      set targetFolder to item 1 of matchingFolders
    `
    : "set targetFolder to default folder";

  return runAppleScript(
    `
      tell application "Notes"
        ${targetFolder}
        make new note at targetFolder with properties {body:"${escapeAppleScript(body)}"}
      end tell
    `,
    { timeout: 30_000 },
  );
}
