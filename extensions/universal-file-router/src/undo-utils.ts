import { LocalStorage, showToast, Toast, trash } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";

export interface UndoHistory {
  id: string;
  timestamp: number;
  type: "move" | "copy" | "rename";
  destFolder: string;
  files: { originalPath: string; newPath: string; ctimeMs?: number; ino?: number }[];
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

export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+-.!|<>])/g, "\\$1");
}

function getUniquePath(targetPath: string): string {
  if (!fs.existsSync(targetPath)) return targetPath;
  const dir = path.dirname(targetPath);
  const basename = path.basename(targetPath);
  const ext = path.extname(basename);
  const name = path.basename(basename, ext);
  let counter = 1;
  let candidate = path.join(dir, `${name} (${counter})${ext}`);
  while (fs.existsSync(candidate)) {
    counter++;
    candidate = path.join(dir, `${name} (${counter})${ext}`);
  }
  return candidate;
}

function isOriginalOutputFile(
  file: { newPath: string; ctimeMs?: number; ino?: number },
  historyTimestamp: number,
): boolean {
  if (!fs.existsSync(file.newPath)) return false;
  try {
    const stat = fs.statSync(file.newPath);

    // 1. If exact inode was recorded, verify it matches
    if (file.ino !== undefined && file.ino !== 0 && stat.ino !== 0) {
      if (stat.ino !== file.ino) return false;
    }

    // 2. If exact ctime was recorded, verify it hasn't changed.
    // Directories receive a new ctime whenever items inside are added/modified,
    // so strict ctime matching is only enforced for regular files.
    if (!stat.isDirectory() && file.ctimeMs !== undefined && file.ctimeMs > 0) {
      if (Math.abs(stat.ctimeMs - file.ctimeMs) > 100) return false;
    }

    // 3. Fallback timestamp check for legacy history items:
    // Any replacement file renamed/moved onto newPath after historyTimestamp
    // receives a status change timestamp (ctime) after historyTimestamp.
    // For directories, content changes update ctime, so we check birthtime (creation time).
    if (historyTimestamp && stat.ctimeMs > historyTimestamp + 100) {
      if (!stat.isDirectory()) {
        return false;
      }
      const birthtime = stat.birthtimeMs && stat.birthtimeMs > 0 ? stat.birthtimeMs : 0;
      if (birthtime > historyTimestamp + 100) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
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

    const successfulIndices: number[] = [];

    for (let i = 0; i < history.files.length; i++) {
      const file = history.files[i];
      let didSucceed = false;
      try {
        if (history.type === "move" || history.type === "rename") {
          // move it back
          if (isOriginalOutputFile(file, history.timestamp)) {
            const targetPath = getUniquePath(file.originalPath);
            try {
              await fs.promises.rename(file.newPath, targetPath);
            } catch (error) {
              const e = error as NodeJS.ErrnoException;
              if (e.code === "EXDEV") {
                await fs.promises.cp(file.newPath, targetPath, { recursive: true });
                try {
                  await trash(file.newPath);
                } catch (rmError) {
                  await fs.promises.rm(targetPath, { recursive: true }).catch(() => {});
                  throw rmError;
                }
              } else {
                throw e;
              }
            }
            didSucceed = true;
          }
        } else {
          // copy - so we delete the new file
          if (isOriginalOutputFile(file, history.timestamp)) {
            await trash(file.newPath);
            didSucceed = true;
          }
        }
      } catch {
        errors.push(`Failed to undo ${path.basename(file.newPath)}`);
      }

      if (didSucceed) {
        successCount++;
        successfulIndices.push(i);
      }
    }

    if (errors.length === 0 && successCount > 0) {
      historyList.splice(indexToUndo, 1);
      if (legacyHistoryStr) {
        await LocalStorage.removeItem("lastAction");
      }
    } else if (successCount > 0) {
      history.files = history.files.filter((_, i) => !successfulIndices.includes(i));
    }

    await LocalStorage.setItem("actionHistory", JSON.stringify(historyList));

    if (errors.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Undo partially failed",
        message: `Restored ${successCount} files. Errors: ${errors.join(", ")}`,
      });
      return false;
    } else if (successCount === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Undo failed",
        message: `No files could be found to revert.`,
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
