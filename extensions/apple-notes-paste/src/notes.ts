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
      repeat with accountItem in accounts
        try
          set targetFolder to folder "${escapeAppleScript(folderName)}" of accountItem
          exit repeat
        end try
      end repeat
      if targetFolder is missing value then error "Folder not found: ${escapeAppleScript(folderName)}"
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
