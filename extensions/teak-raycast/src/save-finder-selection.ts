import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import {
  ensureCredentialsForNoViewCommand,
  isUploadableFile,
  saveFilesWithFeedback,
} from "./lib/capture";

export default async function SaveFinderSelectionCommand() {
  if (!(await ensureCredentialsForNoViewCommand())) {
    return;
  }

  let paths: string[];
  try {
    paths = (await getSelectedFinderItems()).map((item) => item.path);
  } catch {
    paths = [];
  }

  const files = paths.filter(isUploadableFile);
  if (files.length === 0) {
    await showToast({
      message:
        paths.length > 0
          ? "Folders and files over 100 MB can't be saved. Select files instead."
          : "Select one or more files in Finder, then run this command again.",
      style: Toast.Style.Failure,
      title: "No files selected",
    });
    return;
  }

  await saveFilesWithFeedback(files, "raycast_finder");
}
