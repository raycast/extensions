/**
 * Custom hook for loading and managing selected Finder files
 */

import { useState, useEffect, useCallback } from "react";
import { getSelectedFinderItems } from "@raycast/api";
import { stat } from "fs/promises";
import { basename, extname } from "path";
import { scanDirectoryForFiles, deduplicatePaths } from "../lib/files";
import { log } from "../lib/logger";
import { SelectionMode, type FileInfo } from "../types";

interface UseSelectedFilesResult {
  files: FileInfo[];
  isLoading: boolean;
  error: string | null;
  noFilesSelected: boolean;
  setFiles: (files: FileInfo[]) => void;
  refresh: () => Promise<void>;
}

/**
 * Hook to load selected files from Finder
 */
/**
 * Convert file paths to FileInfo objects
 */
export async function pathsToFileInfos(filePaths: string[]): Promise<FileInfo[]> {
  return Promise.all(
    filePaths.map(async (filePath): Promise<FileInfo> => {
      const stats = await stat(filePath);
      const isDirectory = stats.isDirectory();
      const fullName = basename(filePath);
      const extension = isDirectory ? "" : extname(filePath);
      const baseName = isDirectory ? fullName : basename(filePath, extension);

      return {
        path: filePath,
        name: fullName,
        baseName,
        extension,
        isDirectory,
        size: stats.size,
        modified: stats.mtime,
      };
    }),
  );
}

export function useSelectedFiles(mode: SelectionMode = SelectionMode.ALL): UseSelectedFilesResult {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noFilesSelected, setNoFilesSelected] = useState(false);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNoFilesSelected(false);

    try {
      const selected = await getSelectedFinderItems();
      const filePaths = selected.map((file) => file.path);

      if (filePaths.length === 0) {
        setNoFilesSelected(true);
        setIsLoading(false);
        return;
      }

      const fileInfos = await pathsToFileInfos(filePaths);

      let filtered: FileInfo[];
      if (mode === SelectionMode.FILES) {
        // Scan any selected directories for files
        const dirs = fileInfos.filter((f) => f.isDirectory);
        const directFiles = fileInfos.filter((f) => !f.isDirectory);

        if (dirs.length > 0) {
          const scannedPaths: string[] = [];
          for (const dir of dirs) {
            const nested = await scanDirectoryForFiles(dir.path);
            scannedPaths.push(...nested);
          }
          // Deduplicate in case folders overlap or symlinks exist
          const uniquePaths = deduplicatePaths([...directFiles.map((f) => f.path), ...scannedPaths]);
          const allInfos = await pathsToFileInfos(uniquePaths);
          filtered = allInfos.filter((f) => !f.isDirectory);
        } else {
          filtered = directFiles;
        }
      } else if (mode === SelectionMode.FOLDERS) {
        filtered = fileInfos.filter((f) => f.isDirectory);
      } else {
        filtered = fileInfos;
      }

      if (filtered.length === 0) {
        setNoFilesSelected(true);
        setIsLoading(false);
        return;
      }

      setFiles(filtered);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.files.warn("Failed to load selected Finder items, falling back to manual selection", err);
      setError(message);
      setNoFilesSelected(true);
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return {
    files,
    isLoading,
    error,
    noFilesSelected,
    setFiles,
    refresh: loadFiles,
  };
}
