import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";
import { writeFile } from "fs/promises";
import { exec } from "child_process";
import { showFailureToast } from "@raycast/utils";

interface Preferences {
  editor: "code" | "cursor"; // VS Code or Cursor
}

export default async function main() {
  // Get the user's preference for the editor
  const { editor } = getPreferenceValues<Preferences>();

  // Grab the clipboard content at offset 0 and 1
  const clipboard0 = await Clipboard.readText({ offset: 0 });
  const clipboard1 = await Clipboard.readText({ offset: 1 });

  // If the clipboard contents are identical, show a message and exit
  if (clipboard0 === clipboard1) {
    showHUD("Clipboard content is identical. No action taken.");
    return;
  }

  // Store both files separately in a temp file (files in /tmp will be deleted after reboot)
  const content0FilePath = "/tmp/clipboard0.txt";
  const content1FilePath = "/tmp/clipboard1.txt";
  await writeFile(content0FilePath, clipboard0 ?? "");
  await writeFile(content1FilePath, clipboard1 ?? "");

  // The command assumes that either VS Code or Cursor is installed and available in the PATH as `code` or `cursor` respectively.
  const command = `${editor} --diff "${content1FilePath}" "${content0FilePath}"`;

  exec(command, (error: Error | null, stdout: string, stderr: string) => {
    if (error) {
      console.error(`Error executing command: ${error.message}`);
      showFailureToast(error, { title: "Failed to open diff view in Editor" });
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      showFailureToast({ title: "An error occurred while opening the diff view." });
      return;
    }
    console.log(`stdout: ${stdout}`);
    showHUD("Diff view opened in Editor.");
  });
}
