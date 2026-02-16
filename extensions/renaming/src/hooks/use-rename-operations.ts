/**
 * Rename execution lifecycle: rename, retry, undo, close.
 */

import { useState } from "react";
import { popToRoot, closeMainWindow, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { basename, dirname, join } from "path";
import { checkConflicts } from "../lib/files";
import { saveToHistory, undoLastRename } from "../lib/history";
import { withProgress } from "../lib/progress";
import { getUserFriendlyErrorMessage } from "../lib/errors";
import { log } from "../lib/logger";
import type { RenameOperation, FileInfo, RenameResult, SelectionMode } from "../types";

export interface UseRenameOperationsOptions {
  files: FileInfo[];
  mode: SelectionMode;
  generateNewName: (file: FileInfo, index: number) => string;
  isFormValid: () => boolean;
  preview: string[];
  setPreserveName: (v: boolean) => void;
}

export interface UseRenameOperationsResult {
  renameFiles: () => Promise<void>;
  handleClose: () => Promise<void>;
  handleUndo: () => Promise<void>;
  handleRetryFailed: () => Promise<void>;
  operationResults: RenameResult[] | null;
  isProcessing: boolean;
}

export function useRenameOperations({
  files,
  mode,
  generateNewName,
  isFormValid,
  preview,
  setPreserveName,
}: UseRenameOperationsOptions): UseRenameOperationsResult {
  const [operationResults, setOperationResults] = useState<RenameResult[] | null>(null);
  const [pendingOperations, setPendingOperations] = useState<RenameOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const renameFiles = async () => {
    if (!isFormValid()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid input",
        message: "Please enter a new name for the files",
      });
      return;
    }

    const operations: RenameOperation[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const newFileName = generateNewName(file, i);
      operations.push({
        oldPath: file.path,
        newName: newFileName,
        newPath: join(dirname(file.path), newFileName),
      });
    }

    const conflicts = await checkConflicts(operations);
    if (conflicts.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Conflicts detected",
        message: conflicts.slice(0, 3).join("; "),
      });
      return;
    }

    if (operations.length > 1) {
      const previewText = preview.slice(0, 5).join("\n");
      const confirmed = await confirmAlert({
        title: `Rename ${operations.length} ${mode === "folders" ? "Folders" : "Files"}?`,
        message: previewText,
        primaryAction: {
          title: "Rename All",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (!confirmed) return;
    }

    setIsProcessing(true);
    setPendingOperations(operations);

    try {
      const itemLabel = mode === "folders" ? "folder" : "file";
      const description =
        files.length === 1 ? `Renamed "${basename(files[0]!.path)}"` : `Renamed ${operations.length} ${itemLabel}s`;

      const result = await withProgress(operations, {
        actionName: "Renaming",
        itemLabel,
      });

      if (result.successfulOps.length > 0) {
        await saveToHistory(description, result.successfulOps);
      }

      setPreserveName(false);
      setOperationResults(result.results);
    } catch (error) {
      log.rename.error("Rename operation failed", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Rename failed",
        message: getUserFriendlyErrorMessage(error),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = async () => {
    await closeMainWindow();
    await popToRoot();
  };

  const handleUndo = async () => {
    try {
      await undoLastRename();
      setOperationResults(null);
      setPendingOperations([]);
    } catch (err) {
      log.rename.error("Undo failed", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Undo failed",
        message: getUserFriendlyErrorMessage(err),
      });
    }
  };

  const handleRetryFailed = async () => {
    if (!operationResults) return;

    const failedOldPaths = new Set(operationResults.filter((r) => !r.success).map((r) => r.oldPath));
    const failedOperations = pendingOperations.filter((op) => failedOldPaths.has(op.oldPath));

    if (failedOperations.length === 0) return;

    setIsProcessing(true);

    try {
      const retryLabel = mode === "folders" ? "folder" : "file";
      const result = await withProgress(failedOperations, {
        actionName: "Retrying",
        itemLabel: retryLabel,
      });

      if (result.successfulOps.length > 0) {
        const retryNoun = result.successfulOps.length === 1 ? retryLabel : `${retryLabel}s`;
        await saveToHistory(`Retried ${result.successfulOps.length} ${retryNoun}`, result.successfulOps);
      }

      const newResults = operationResults.map((oldResult) => {
        if (oldResult.success) return oldResult;
        const retryResult = result.results.find((r) => r.oldPath === oldResult.oldPath);
        return retryResult || oldResult;
      });

      setOperationResults(newResults);
    } catch (error) {
      log.rename.error("Retry failed for failed operations", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Retry failed",
        message: getUserFriendlyErrorMessage(error),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    renameFiles,
    handleClose,
    handleUndo,
    handleRetryFailed,
    operationResults,
    isProcessing,
  };
}
