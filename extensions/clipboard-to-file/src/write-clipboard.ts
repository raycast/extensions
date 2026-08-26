import {
  Clipboard,
  LaunchProps,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { copyFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Arguments = {
  label: string;
};

type Preferences = {
  destinationPath: string;
};

function getDestination(destinationPath: string, label: string): string {
  const filename = label.trim();

  if (
    !filename ||
    filename === "." ||
    filename === ".." ||
    filename.includes("/") ||
    filename.includes("\0")
  ) {
    throw new Error("Label must be a single filename without slashes");
  }

  return path.join(destinationPath, filename);
}

export default async function Command(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const destination = getDestination(
      preferences.destinationPath,
      props.arguments.label,
    );
    const clipboard = await Clipboard.read();

    if (clipboard.file) {
      await copyFile(clipboard.file, destination);
    } else {
      await writeFile(destination, clipboard.text, "utf8");
    }

    await showHUD(`Saved clipboard to ${destination}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not write clipboard",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
