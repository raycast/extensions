/**
 * Rename File(s) command — batch rename files with prefix, suffix, and numbering.
 */

import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { dirname, join } from "path";
import { batchRename, checkConflicts } from "./lib/batch";
import { openRenameHistory, recordRenameHistory } from "./lib/history-nav";
import { itemNoun, loadSelection, type SelectionMode } from "./lib/selection";
import { log } from "./lib/logger";
import type { FileInfo, RenameOperation } from "./types";

export default function Command({ foldersOnly = false }: { foldersOnly?: boolean } = {}) {
  const mode: SelectionMode = foldersOnly ? "folders" : "files";
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [newName, setNewName] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  const [suffix, setSuffix] = useState<string>("");
  // Keyed by mode: Rename File(s) and Rename Folder(s) share this component,
  // and one command's toggle must not leak into the other's cached state.
  const [preserveName, setPreserveName] = useCachedState<boolean>(
    foldersOnly ? "preserveName-folders" : "preserveName",
    false,
  );
  const [preview, setPreview] = useState<string>("");
  const [separator, setSeparator] = useState<string>("_");
  const [indexSeparator, setIndexSeparator] = useState<string>("-");

  const getSelectedFiles = async () => {
    const fileInfos = await loadSelection(mode);
    if (!fileInfos) {
      return;
    }

    if (fileInfos.length === 1) {
      setPreserveName(false);
    }
    setFiles(fileInfos);
  };

  const handleSeparatorChange = async (separatorType: "separator" | "indexSeparator", value: string) => {
    if (value.includes("/")) {
      if (separatorType === "separator") {
        setSeparator("");
      } else {
        setIndexSeparator("");
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid separator",
        message: "The separator cannot be a forward slash (/)",
      });
    } else {
      if (separatorType === "separator") {
        setSeparator(value);
      } else {
        setIndexSeparator(value);
      }
    }
  };

  useEffect(() => {
    getSelectedFiles();
  }, []);

  const generateNewName = (index: number): string => {
    const fileInfo = files[index];
    if (!fileInfo) {
      return "";
    }

    const prefixWithSeparator = prefix ? `${prefix}${separator}` : "";
    const suffixWithSeparator = suffix ? `${separator}${suffix}` : "";

    const indexSuffix = files.length > 1 && !preserveName ? `${indexSeparator}${index + 1}` : "";
    const newBaseName = preserveName
      ? `${prefixWithSeparator}${fileInfo.baseName}${suffixWithSeparator}`
      : `${prefixWithSeparator}${newName}${indexSuffix}${suffixWithSeparator}`;

    return fileInfo.isDirectory || !fileInfo.extension ? newBaseName : `${newBaseName}${fileInfo.extension}`;
  };

  const renameFiles = async () => {
    try {
      // Build rename operations
      const operations: RenameOperation[] = files.map((fileInfo, i) => {
        const newFileName = generateNewName(i);
        return {
          oldPath: fileInfo.path,
          newName: newFileName,
          newPath: join(dirname(fileInfo.path), newFileName),
        };
      });

      // Guard against renames that produce an empty base name
      const emptyBases = operations.filter((op, i) => {
        const ext = files[i].extension || "";
        const base = ext ? op.newName.slice(0, -ext.length) : op.newName;
        return base === "";
      });
      if (emptyBases.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "New name cannot be empty",
          message: `Please enter a name for the ${itemNoun(mode, 1)}`,
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
        `Renamed ${successfulOps.length} ${itemNoun(mode, successfulOps.length)}`,
        successfulOps,
      );

      const successCount = successfulOps.length;
      const failureCount = results.filter((r) => !r.success).length;

      if (failureCount === 0) {
        setPreserveName(false);
        await showToast({
          style: Toast.Style.Success,
          title: `Renamed ${successCount} ${itemNoun(mode, successCount)}`,
          // An empty batch records no history by design — only warn when
          // there was something to save and saving failed.
          message: successCount > 0 && !historySaved ? "History could not be saved" : undefined,
        });
        await openRenameHistory(historySaved);
      } else if (successCount > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Renamed ${successCount} of ${results.length} ${itemNoun(mode, results.length)}`,
          message: results.find((r) => !r.success)?.error,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to rename ${itemNoun(mode, results.length)}`,
          message: results.find((r) => !r.success)?.error,
        });
      }
    } catch (error) {
      log.rename.error("Failed to rename files", error);

      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to rename ${itemNoun(mode, files.length)}`,
        message: (error as Error).message,
      });
    }
  };

  useEffect(() => {
    setPreview(generateNewName(0));
  }, [newName, prefix, suffix, preserveName, files, separator, indexSeparator]);

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Rename" onSubmit={renameFiles} />
          </ActionPanel>
        }
      >
        {files.length > 0 && (
          <>
            {files.length > 1 && (
              <Form.Checkbox
                id="preserveName"
                label="Preserve base name"
                value={preserveName}
                onChange={setPreserveName}
              />
            )}
            {(!preserveName || files.length === 1) && (
              <Form.TextField
                id="newName"
                title="New Name"
                value={newName}
                onChange={setNewName}
                placeholder="Enter new name"
              />
            )}
            <Form.TextField id="prefix" title="Prefix" value={prefix} onChange={setPrefix} placeholder="Enter prefix" />
            <Form.TextField id="suffix" title="Suffix" value={suffix} onChange={setSuffix} placeholder="Enter suffix" />
            <Form.TextField
              id="separator"
              title="Separator"
              value={separator}
              onChange={(newValue) => handleSeparatorChange("separator", newValue)}
              placeholder="Enter separator"
            />
            {!preserveName && files.length > 1 && (
              <Form.TextField
                id="indexSeparator"
                title="Index Separator"
                value={indexSeparator}
                onChange={(newValue) => handleSeparatorChange("indexSeparator", newValue)}
                placeholder="Enter Index separator"
              />
            )}
            <Form.Description title="Preview" text={preview} />
          </>
        )}
        <Form.Separator />
      </Form>
    </>
  );
}
