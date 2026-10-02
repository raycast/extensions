import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { addCapture, errorMessage } from "./capture-cli";

// The sandboxed CLI can only read files inside its app group container, so
// clipboard files are staged there before handing the path over.
const stagingDirectory = path.join(
  homedir(),
  "Library/Group Containers/group.capture.defaults/RaycastAttachments",
);

export default async function Command() {
  await closeMainWindow({ clearRootSearch: true });
  try {
    const { text, file } = await Clipboard.read();

    if (file) {
      const sourcePath = file.startsWith("file://")
        ? decodeURIComponent(new URL(file).pathname)
        : file;
      await mkdir(stagingDirectory, { recursive: true });
      const stagedPath = path.join(
        stagingDirectory,
        `${Date.now()}-${path.basename(sourcePath)}`,
      );
      await copyFile(sourcePath, stagedPath);
      try {
        await addCapture("", undefined, stagedPath);
      } finally {
        await rm(stagedPath, { force: true });
      }
      await showHUD(`Captured ${path.basename(sourcePath)}`);
    } else if (text?.trim()) {
      await addCapture(text);
      await showHUD("Captured clipboard text");
    } else {
      await showHUD("Clipboard is empty");
    }
  } catch (error) {
    await showHUD(`Could not capture: ${errorMessage(error)}`);
  }
}
