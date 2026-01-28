import { Color, Icon } from "@raycast/api";
import { CommitFileChange, FileStatus } from "../../types/git-types";

/**
 * Icons for different types of changes
 */
export const FileStatusIcon = (file: FileStatus) => {
  if (file.isConflicted) {
    return { source: `alert-square-filled.svg`, tintColor: Color.Red, tooltip: `Conflicted (${file.type})` };
  }

  switch (file.type) {
    case "added":
      return { source: `plus-square.svg`, tintColor: Color.Green, tooltip: "Added" };
    case "modified":
      return { source: `square-pen.svg`, tintColor: Color.Yellow, tooltip: "Modified" };
    case "deleted":
      return { source: `square-minus.svg`, tintColor: Color.Red, tooltip: "Deleted" };
    case "renamed":
      return { source: `square-arrow-right-filled.svg`, tintColor: Color.Blue, tooltip: "Moved from " + file.oldPath };
    case "copied":
      return { source: `copy.svg`, tintColor: Color.Purple, tooltip: "Copied from " + file.oldPath };
    default:
      return { source: Icon.Document, tintColor: Color.SecondaryText, tooltip: "Unknown" };
  }
};

/**
 * Icons for commit file changes
 */
export const CommitFileIcon = (change: CommitFileChange) => {
  switch (change.status) {
    case "added":
      return { source: `plus-square.svg`, tintColor: Color.Green, tooltip: "Added" };
    case "modified":
    case "changed":
      return { source: `square-pen.svg`, tintColor: Color.Yellow, tooltip: "Modified" };
    case "deleted":
      return { source: `square-minus.svg`, tintColor: Color.Red, tooltip: "Deleted" };
    case "renamed":
      return {
        source: `square-arrow-right-filled.svg`,
        tintColor: Color.Blue,
        tooltip: "Moved from " + change.oldPath,
      };
    case "copied":
      return { source: `copy.svg`, tintColor: Color.Purple, tooltip: "Copied from " + change.oldPath };
    default:
      return { source: Icon.Document, tintColor: Color.SecondaryText, tooltip: "Unknown" };
  }
};
