import { showHUD, Clipboard } from "@raycast/api";
import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { showFailureToast } from "@raycast/utils";
import { getEditorPreference, openDiffInEditor } from "./editor";

export default async function main() {
  // Get the user's preference for the editor
  const editor = getEditorPreference();

  // Grab the clipboard content at offset 0 and 1
  const clipboard0 = await Clipboard.readText({ offset: 0 });
  const clipboard1 = await Clipboard.readText({ offset: 1 });

  // Need at least two clipboard entries to compare
  if (clipboard0 === undefined || clipboard1 === undefined) {
    await showHUD("Need at least two clipboard entries to compare.");
    return;
  }

  // If the clipboard contents are identical, show a message and exit
  if (clipboard0 === clipboard1) {
    await showHUD("Clipboard content is identical. No action taken.");
    return;
  }

  // Store both entries in unique temp files (files in the temp dir are cleaned up by the OS) so
  // concurrent runs cannot clobber each other and the paths are not predictable in shared /tmp.
  const runId = randomUUID();
  const content0FilePath = join(tmpdir(), `diff-view-${runId}-0.txt`);
  const content1FilePath = join(tmpdir(), `diff-view-${runId}-1.txt`);
  await writeFile(content0FilePath, clipboard0);
  await writeFile(content1FilePath, clipboard1);

  try {
    await openDiffInEditor(editor, content1FilePath, content0FilePath);
    await showHUD("Diff view opened in Editor.");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to open diff view in Editor" });
  }
}
