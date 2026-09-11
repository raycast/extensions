/**
 * Finder-selection loading and scoping shared by the rename commands.
 *
 * Every rename command resolves the same Finder selection and then narrows it
 * to one target type: the file commands act on files, the folder commands on
 * folders, and Advanced Batch Rename lets the user pick. Keeping the filter and
 * the noun in one place means a folder batch can never report "files".
 */

import { getSelectedFinderItems, popToRoot, showToast, Toast } from "@raycast/api";
import { getFileInfo } from "./files";
import { log } from "./logger";
import type { FileInfo } from "../types";

/**
 * What a rename acts on. `"both"` exists only for Advanced Batch Rename, whose
 * scope is chosen in the UI; the single-target commands use a
 * {@link SelectionMode}.
 */
export type RenameScope = "files" | "folders" | "both";

/** The scope of a command that targets exactly one entry type. */
export type SelectionMode = Exclude<RenameScope, "both">;

const NOUNS: Record<RenameScope, { readonly one: string; readonly many: string }> = {
  files: { one: "file", many: "files" },
  folders: { one: "folder", many: "folders" },
  both: { one: "item", many: "items" },
};

/**
 * The noun for the given scope, singular or plural for the given count:
 * "file" / "files", "folder" / "folders", or "item" / "items" when the scope
 * covers both.
 */
export function itemNoun(scope: RenameScope, count: number): string {
  const noun = NOUNS[scope];
  return count === 1 ? noun.one : noun.many;
}

/**
 * Keep only the entries the scope targets: files, folders, or everything.
 */
export function filterByScope<T extends { readonly isDirectory: boolean }>(
  items: readonly T[],
  scope: RenameScope,
): T[] {
  if (scope === "both") {
    return [...items];
  }
  const wantDirectory = scope === "folders";
  return items.filter((item) => item.isDirectory === wantDirectory);
}

/**
 * Resolve the current Finder selection, keeping only the entries the mode
 * targets — a mixed selection acts on just its files, or just its folders.
 *
 * Returns null when there is nothing to act on: the failure toast naming the
 * right noun has already been shown and the command has popped to root.
 */
export async function loadSelection(mode: SelectionMode): Promise<FileInfo[] | null> {
  try {
    const selectedItems = await getSelectedFinderItems();
    const filePaths = selectedItems.map((item) => item.path);
    log.rename.debug("Fetched files", filePaths);

    if (filePaths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Please select at least one ${itemNoun(mode, 1)} or open a Finder window`,
      });
      await popToRoot();
      return null;
    }

    const allInfos = await Promise.all(filePaths.map((p) => getFileInfo(p)));
    const fileInfos = filterByScope(allInfos, mode);

    // Reachable whenever the selection holds nothing of the targeted type.
    if (fileInfos.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Please select at least one ${itemNoun(mode, 1)} in Finder`,
      });
      await popToRoot();
      return null;
    }

    return fileInfos;
  } catch (error) {
    log.rename.error("Failed to fetch files", error);
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to fetch ${itemNoun(mode, 2)}`,
      message: `Please make sure a Finder window is open and ${itemNoun(mode, 2)} are selected`,
    });
    await popToRoot();
    return null;
  }
}
