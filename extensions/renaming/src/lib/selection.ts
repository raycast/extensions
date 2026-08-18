/**
 * Finder-selection loading shared by the rename commands.
 *
 * Every rename command resolves the same Finder selection; the folder-only
 * variants differ only in filtering out non-directories and in the noun their
 * user-visible strings use. Keeping both in one place means a folder batch can
 * never report "files".
 */

import { getSelectedFinderItems, popToRoot, showToast, Toast } from "@raycast/api";
import { getFileInfo } from "./files";
import { log } from "./logger";
import type { FileInfo } from "../types";

/**
 * The noun for the command's mode, singular or plural for the given count:
 * "file" / "files" / "folder" / "folders".
 */
export function itemNoun(foldersOnly: boolean, count: number): string {
  const noun = foldersOnly ? "folder" : "file";
  return count === 1 ? noun : `${noun}s`;
}

/**
 * Resolve the current Finder selection, keeping only directories when
 * `foldersOnly` is set — a mixed selection then acts on just its folders.
 *
 * Returns null when there is nothing to act on: the failure toast naming the
 * right noun has already been shown and the command has popped to root.
 */
export async function loadSelection(foldersOnly: boolean): Promise<FileInfo[] | null> {
  try {
    const selectedItems = await getSelectedFinderItems();
    const filePaths = selectedItems.map((item) => item.path);
    log.rename.debug("Fetched files", filePaths);

    if (filePaths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Please select at least one ${itemNoun(foldersOnly, 1)} or open a Finder window`,
      });
      await popToRoot();
      return null;
    }

    const allInfos = await Promise.all(filePaths.map((p) => getFileInfo(p)));
    const fileInfos = foldersOnly ? allInfos.filter((info) => info.isDirectory) : allInfos;

    // Only reachable in folder mode: an unfiltered selection is non-empty here.
    if (fileInfos.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Please select at least one ${itemNoun(foldersOnly, 1)} in Finder`,
      });
      await popToRoot();
      return null;
    }

    return fileInfos;
  } catch (error) {
    log.rename.error("Failed to fetch files", error);
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to fetch ${itemNoun(foldersOnly, 2)}`,
      message: `Please make sure a Finder window is open and ${itemNoun(foldersOnly, 2)} are selected`,
    });
    await popToRoot();
    return null;
  }
}
