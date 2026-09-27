import { runAppleScript } from "@raycast/utils";

function escapeHTML(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function getNotePlainText(id: string) {
  return runAppleScript(
    `on run argv
      tell application "Notes"
        set targetNote to note id (item 1 of argv)
        if password protected of targetNote then error "Unlock and read protected notes in Apple Notes."
        return plaintext of targetNote
      end tell
    end run`,
    [id],
    { timeout: 30_000 },
  );
}

export async function createAppleNote(title: string, content: string, folderName?: string) {
  if (!title.trim() || /[\r\n]/.test(title)) throw new Error("Enter a non-empty, single-line title.");
  const body = `<h1>${escapeHTML(title)}</h1><div>${escapeHTML(content).replace(/\r?\n/g, "<br>")}</div>`;
  const targetFolder = folderName
    ? `
      set targetFolder to missing value
      set matchingFolders to {}
      repeat with accountItem in accounts
        repeat with folderItem in folders of accountItem
          if name of folderItem is (item 2 of argv) then set end of matchingFolders to contents of folderItem
        end repeat
      end repeat
      if (count of matchingFolders) is 0 then error "The configured folder was not found. Check Default Folder in extension preferences."
      if (count of matchingFolders) is greater than 1 then error "Multiple folders have this name. Use a unique folder name before creating a note."
      set targetFolder to item 1 of matchingFolders
    `
    : "set targetFolder to default folder of default account";

  return runAppleScript(
    `
      on run argv
      tell application "Notes"
        ${targetFolder}
        set createdNote to make new note at targetFolder with properties {body:(item 1 of argv)}
        return id of createdNote
      end tell
      end run
    `,
    [body, folderName ?? ""],
    { timeout: 30_000 },
  );
}
