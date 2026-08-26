import {
  Clipboard,
  LaunchProps,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { copyFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

function getDestination(destinationPath: string, label: string): string {
  const filename = label.trim();

  if (
    !filename ||
    filename === "." ||
    filename === ".." ||
    filename.includes("/") ||
    filename.includes("\0")
  ) {
    throw new Error("Filename must not be empty or contain slashes");
  }

  return path.join(destinationPath, filename);
}

async function writeClipboard(destination: string): Promise<void> {
  const clipboard = await Clipboard.read();
  const temporaryPath = path.join(
    path.dirname(destination),
    `.${path.basename(destination)}.${randomUUID()}.tmp`,
  );

  try {
    if (clipboard.file) {
      await copyFile(clipboard.file, temporaryPath);
    } else {
      await writeFile(temporaryPath, clipboard.text, "utf8");
    }

    await rename(temporaryPath, destination);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.WriteClipboard }>,
) {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const destination = getDestination(
      preferences.destinationPath,
      props.arguments.label,
    );

    await writeClipboard(destination);
    await showHUD(`Saved clipboard to ${destination}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Write Clipboard",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
