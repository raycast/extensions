import { showToast, Toast } from "@raycast/api";
import { Note } from "../utils/interfaces";

export function noVaultPathsToast() {
  showToast({
    title: "Path Error",
    message: "Something went wrong with your vault path. There are no paths to select from.",
    style: Toast.Style.Failure,
  });
}

export function directoryCreationErrorToast(path: string) {
  showToast({
    title: "Couldn't create directories for the given path:",
    message: path,
    style: Toast.Style.Failure,
  });
}

export function fileWriteErrorToast(path: string, filename: string) {
  showToast({
    title: "Couldn't write to file:",
    message: path + "/" + filename + ".md",
    style: Toast.Style.Failure,
  });
}

export function notePinnedToast(note: Note) {
  showToast({
    title: "Note Pinned",
    message: "'" + note.title + "' pinned successfully.",
    style: Toast.Style.Success,
  });
}

export function noteAlreadyPinnedToast(note: Note) {
  showToast({
    title: "Already Pinned",
    message: "'" + note.title + "' is already pinned.",
    style: Toast.Style.Failure,
  });
}

export function noteUnpinnedToast(note: Note) {
  showToast({
    title: "Note Unpinned",
    message: "'" + note.title + "' unpinned successfully.",
    style: Toast.Style.Success,
  });
}
