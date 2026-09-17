import fs from "fs";
import path from "path";

const EMPTY_FOLDER_METADATA_FILES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

export interface EmptyFolderResult {
  total_folders: number;
  folders: string[];
  skipped_folders: SkippedFolder[];
  success: boolean;
  error?: string;
}

export interface SkippedFolder {
  path: string;
  reason: string;
}

interface EmptyFolderScan {
  emptyFolders: string[];
  skippedFolders: SkippedFolder[];
}

function getErrorReason(error: unknown): string {
  if (error instanceof Error) {
    const errorWithCode = error as NodeJS.ErrnoException;
    if (errorWithCode.code === "EACCES" || errorWithCode.code === "EPERM") {
      return "Permission denied";
    }

    return error.message;
  }

  return "Unknown error";
}

function findEmptyFolders(rootPath: string): EmptyFolderScan {
  const emptyFolders: string[] = [];
  const skippedFolders: SkippedFolder[] = [];

  function scanFolder(folderPath: string): boolean {
    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(folderPath, { withFileTypes: true });
    } catch (error) {
      skippedFolders.push({
        path: path.relative(rootPath, folderPath) || ".",
        reason: getErrorReason(error),
      });
      return false;
    }

    let willBeEmpty = true;

    for (const entry of entries) {
      if (entry.isFile() && EMPTY_FOLDER_METADATA_FILES.has(entry.name)) {
        continue;
      }

      if (!entry.isDirectory() || entry.isSymbolicLink()) {
        willBeEmpty = false;
        continue;
      }

      const childPath = path.join(folderPath, entry.name);
      if (!scanFolder(childPath)) {
        willBeEmpty = false;
      }
    }

    if (willBeEmpty && folderPath !== rootPath) {
      emptyFolders.push(folderPath);
    }

    return willBeEmpty;
  }

  scanFolder(rootPath);
  return {
    emptyFolders,
    skippedFolders,
  };
}

export function analyzeEmptyFolders(rootPath: string): EmptyFolderResult {
  try {
    const { emptyFolders, skippedFolders } = findEmptyFolders(rootPath);
    return {
      total_folders: emptyFolders.length,
      folders: emptyFolders.map((folder) => path.relative(rootPath, folder)),
      skipped_folders: skippedFolders,
      success: true,
    };
  } catch (error) {
    return {
      total_folders: 0,
      folders: [],
      skipped_folders: [],
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export function deleteEmptyFolders(rootPath: string, relativeFolders: string[]): EmptyFolderResult {
  const resolvedRootPath = path.resolve(rootPath);
  const deletedFolders: string[] = [];
  const skippedFolders: SkippedFolder[] = [];

  for (const relativeFolder of relativeFolders) {
    try {
      const folderPath = path.resolve(resolvedRootPath, relativeFolder);

      if (!folderPath.startsWith(`${resolvedRootPath}${path.sep}`)) {
        throw new Error(`Refusing to delete a folder outside the selected root: ${relativeFolder}`);
      }

      if (!fs.existsSync(folderPath)) {
        skippedFolders.push({
          path: relativeFolder,
          reason: "Folder no longer exists",
        });
        continue;
      }

      const stats = fs.lstatSync(folderPath);
      if (!stats.isDirectory() || stats.isSymbolicLink()) {
        skippedFolders.push({
          path: relativeFolder,
          reason: "Path is no longer a regular folder",
        });
        continue;
      }

      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      if (entries.some((entry) => !entry.isFile() || !EMPTY_FOLDER_METADATA_FILES.has(entry.name))) {
        skippedFolders.push({
          path: relativeFolder,
          reason: "Folder is no longer empty",
        });
        continue;
      }

      for (const entry of entries) {
        fs.unlinkSync(path.join(folderPath, entry.name));
      }

      fs.rmdirSync(folderPath);
      deletedFolders.push(relativeFolder);
    } catch (error) {
      skippedFolders.push({
        path: relativeFolder,
        reason: getErrorReason(error),
      });
    }
  }

  return {
    total_folders: deletedFolders.length,
    folders: deletedFolders,
    skipped_folders: skippedFolders,
    success: true,
  };
}
