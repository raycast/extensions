import { LocalStorage, showToast, Toast } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";

export interface UndoHistory {
  id: string;
  timestamp: number;
  type: "move" | "copy" | "rename";
  destFolder: string;
  files: { originalPath: string; newPath: string }[];
}

export async function addHistory(action: Omit<UndoHistory, "id">) {
  const historyStr = await LocalStorage.getItem<string>("actionHistory");
  let historyList: UndoHistory[] = [];
  if (historyStr) {
    try {
      historyList = JSON.parse(historyStr);
    } catch {
      // ignore
    }
  }

  const newAction: UndoHistory = {
    ...action,
    id: Math.random().toString(36).substring(2, 9),
  };

  historyList = [newAction, ...historyList].slice(0, 20); // Keep last 20
  await LocalStorage.setItem("actionHistory", JSON.stringify(historyList));

  // Clean up old single-item history if it exists
  await LocalStorage.removeItem("lastAction");
}

export async function performUndo(specificId?: string) {
  const historyStr = await LocalStorage.getItem<string>("actionHistory");
  const legacyHistoryStr = await LocalStorage.getItem<string>("lastAction");

  if (!historyStr && !legacyHistoryStr) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to undo",
      message: "No recent file operations found.",
    });
    return false;
  }

  try {
    let historyList: UndoHistory[] = [];
    if (historyStr) {
      historyList = JSON.parse(historyStr);
    } else if (legacyHistoryStr && !specificId) {
      // Handle legacy undo format gracefully
      const legacy = JSON.parse(legacyHistoryStr);
      historyList = [{ ...legacy, id: "legacy", destFolder: "Unknown" }];
    }

    if (historyList.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing to undo" });
      return false;
    }

    const indexToUndo = specificId ? historyList.findIndex((h) => h.id === specificId) : 0;
    if (indexToUndo === -1) {
      await showToast({ style: Toast.Style.Failure, title: "Action not found in history" });
      return false;
    }

    const history = historyList[indexToUndo];
    let successCount = 0;
    const errors: string[] = [];

    for (const file of history.files) {
      try {
        if (history.type === "move" || history.type === "rename") {
          // move it back
          if (fs.existsSync(file.newPath)) {
            try {
              await fs.promises.rename(file.newPath, file.originalPath);
            } catch (error) {
              const e = error as NodeJS.ErrnoException;
              if (e.code === "EXDEV") {
                await fs.promises.cp(file.newPath, file.originalPath, { recursive: true });
                await fs.promises.rm(file.newPath, { recursive: true });
              } else {
                throw e;
              }
            }
            successCount++;
          }
        } else {
          // copy - so we delete the new file
          if (fs.existsSync(file.newPath)) {
            await fs.promises.rm(file.newPath, { recursive: true });
            successCount++;
          }
        }
      } catch {
        errors.push(`Failed to undo ${path.basename(file.newPath)}`);
      }
    }

    // Remove the undone item from history
    historyList.splice(indexToUndo, 1);
    await LocalStorage.setItem("actionHistory", JSON.stringify(historyList));
    if (legacyHistoryStr) {
      await LocalStorage.removeItem("lastAction");
    }

    if (errors.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Undo partially failed",
        message: `Restored ${successCount} files. Errors: ${errors.join(", ")}`,
      });
      return false;
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: "Undo successful",
        message: `Reverted ${successCount} file(s).`,
      });
      return true;
    }
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to parse history",
    });
    return false;
  }
}
