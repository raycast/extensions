/**
 * Replace File(s) Characters command — find and replace characters in file names.
 */

import { useEffect, useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  closeMainWindow,
  popToRoot,
  showToast,
  Toast,
  getSelectedFinderItems,
  Icon,
} from "@raycast/api";
import { dirname, join } from "path";
import { getFileInfo } from "./lib/files";
import { batchRename, checkConflicts } from "./lib/batch";
import { log } from "./lib/logger";
import type { FileInfo, RenameOperation } from "./types";

export default function Command() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [replaceCharacter, setReplaceCharacter] = useState<string>("");
  const [newCharacter, setNewCharacter] = useState<string>("");

  const getSelectedFiles = async () => {
    try {
      const selectedItems = await getSelectedFinderItems();
      const filePaths = selectedItems.map((file) => file.path);
      log.rename.debug("Fetched files", filePaths);

      if (filePaths.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please select at least one file or open a Finder window",
        });
        popToRoot();
        return;
      }

      const fileInfos = await Promise.all(filePaths.map((p) => getFileInfo(p)));
      setFiles(fileInfos);
    } catch (error) {
      log.rename.error("Failed to fetch files", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch files",
        message: "Please make sure a Finder window is open and files are selected",
      });
      popToRoot();
    }
  };

  useEffect(() => {
    getSelectedFiles();
  }, []);

  const renameFiles = async () => {
    try {
      // Guard against empty search string — replaceAll("", x) inserts x between every character
      if (replaceCharacter === "") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Nothing to replace",
          message: "Please enter a character to replace",
        });
        return;
      }

      // Build rename operations from the replace logic
      const operations: RenameOperation[] = files.map((fileInfo) => {
        const newBaseName = fileInfo.baseName.replaceAll(replaceCharacter, newCharacter);
        const newFileName =
          fileInfo.isDirectory || !fileInfo.extension ? newBaseName : `${newBaseName}${fileInfo.extension}`;
        return {
          oldPath: fileInfo.path,
          newName: newFileName,
          newPath: join(dirname(fileInfo.path), newFileName),
        };
      });

      // Guard against replacements that remove the entire base name
      const emptyBases = files.filter((fileInfo) => {
        const newBase = fileInfo.baseName.replaceAll(replaceCharacter, newCharacter);
        return newBase === "";
      });
      if (emptyBases.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Replace would remove base name",
          message: `${emptyBases.length} file${emptyBases.length > 1 ? "s" : ""} would lose ${emptyBases.length > 1 ? "their" : "its"} base name`,
        });
        return;
      }

      // Check for conflicts before renaming
      const conflicts = await checkConflicts(operations);
      if (conflicts.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Rename conflicts detected",
          message: conflicts[0],
        });
        return;
      }

      // Perform batch rename
      const results = await batchRename(operations);

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      if (failureCount === 0) {
        await closeMainWindow();
        await popToRoot();
      } else if (successCount > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Replaced in ${successCount} of ${results.length} files`,
          message: results.find((r) => !r.success)?.error,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to replace file characters",
          message: results.find((r) => !r.success)?.error,
        });
      }
    } catch (error) {
      log.rename.error("Failed to replace file characters", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to replace file characters",
        message: (error as Error).message,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Replace" icon={Icon.Pencil} onSubmit={renameFiles} />
        </ActionPanel>
      }
    >
      {files.length > 0 && (
        <>
          <Form.TextField
            id="replaceCharacter"
            title="Character to Replace"
            value={replaceCharacter}
            onChange={setReplaceCharacter}
            placeholder="Enter character to replace"
          />
          <Form.TextField
            id="newCharacter"
            title="New Character"
            value={newCharacter}
            onChange={setNewCharacter}
            placeholder="Enter new character"
          />
        </>
      )}
      <Form.Separator />
    </Form>
  );
}
