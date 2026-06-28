/**
 * Rename File(s) command — batch rename files with prefix, suffix, and numbering.
 */

import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import {
  Form,
  ActionPanel,
  Action,
  closeMainWindow,
  popToRoot,
  showToast,
  Toast,
  getSelectedFinderItems,
} from "@raycast/api";
import { dirname, join } from "path";
import { getFileInfo } from "./lib/files";
import { batchRename, checkConflicts } from "./lib/batch";
import { log } from "./lib/logger";
import type { FileInfo, RenameOperation } from "./types";

export default function Command() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [newName, setNewName] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  const [suffix, setSuffix] = useState<string>("");
  const [preserveName, setPreserveName] = useCachedState<boolean>("preserveName", false);
  const [preview, setPreview] = useState<string>("");
  const [separator, setSeparator] = useState<string>("_");
  const [indexSeparator, setIndexSeparator] = useState<string>("-");

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
      if (fileInfos.length === 1) {
        setPreserveName(false);
      }
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
          message: "Please enter a name for the file",
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
        setPreserveName(false);
        await closeMainWindow();
        await popToRoot();
      } else if (successCount > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Renamed ${successCount} of ${results.length} files`,
          message: results.find((r) => !r.success)?.error,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to rename files",
          message: results.find((r) => !r.success)?.error,
        });
      }
    } catch (error) {
      log.rename.error("Failed to rename files", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to rename files",
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
