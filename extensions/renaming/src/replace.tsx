/**
 * Replace in File Names command — find and replace characters in file names.
 */

import { useEffect, useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { dirname, join } from "path";
import { batchRename, checkConflicts } from "./lib/batch";
import { openRenameHistory, recordRenameHistory } from "./lib/history-nav";
import { itemNoun, loadSelection, type SelectionMode } from "./lib/selection";
import { log } from "./lib/logger";
import type { FileInfo, RenameOperation } from "./types";

export default function Command({ foldersOnly = false }: { foldersOnly?: boolean } = {}) {
  const mode: SelectionMode = foldersOnly ? "folders" : "files";
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [replaceCharacter, setReplaceCharacter] = useState<string>("");
  const [newCharacter, setNewCharacter] = useState<string>("");

  const getSelectedFiles = async () => {
    const fileInfos = await loadSelection(mode);
    if (!fileInfos) {
      return;
    }

    setFiles(fileInfos);
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
          message: `${emptyBases.length} ${itemNoun(mode, emptyBases.length)} would lose ${emptyBases.length > 1 ? "their" : "its"} base name`,
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

      const successfulOps = results.filter((r) => r.success).map(({ oldPath, newPath }) => ({ oldPath, newPath }));
      const historySaved = await recordRenameHistory(
        `Replaced characters in ${successfulOps.length} ${itemNoun(mode, successfulOps.length)}`,
        successfulOps,
      );

      const successCount = successfulOps.length;
      const failureCount = results.filter((r) => !r.success).length;

      if (failureCount === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `Replaced characters in ${successCount} ${itemNoun(mode, successCount)}`,
          // An empty batch records no history by design — only warn when
          // there was something to save and saving failed.
          message: successCount > 0 && !historySaved ? "History could not be saved" : undefined,
        });
        await openRenameHistory(historySaved);
      } else if (successCount > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Replaced in ${successCount} of ${results.length} ${itemNoun(mode, results.length)}`,
          message: results.find((r) => !r.success)?.error,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to replace characters in ${itemNoun(mode, 1)} names`,
          message: results.find((r) => !r.success)?.error,
        });
      }
    } catch (error) {
      log.rename.error("Failed to replace file characters", error);

      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to replace characters in ${itemNoun(mode, 1)} names`,
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
