import { useCachedState } from "@raycast/utils";
import { useEffect, useCallback } from "react";
import type { File } from "../types";

import { FileCollectionConfig, loadFileCollection, saveFileCollection } from "../lib/fileStorage";

export function useFileCollection(config: FileCollectionConfig) {
  const [files, setFiles] = useCachedState<File[]>(config.cacheKey);

  const loadFiles = useCallback(async () => {
    const loadedFiles = await loadFileCollection(config);
    setFiles(loadedFiles);
  }, [config.storageKey, setFiles]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  async function addFile(file: File) {
    if (!files) return;

    // Remove existing file with same key to prevent duplicates
    const filteredFiles = files.filter((item) => item.key !== file.key);

    // Add new file at the beginning
    const nextFiles = [file, ...filteredFiles].slice(0, config.maxItems);
    setFiles(nextFiles);
    await saveFileCollection(config, nextFiles);
  }

  async function removeFile(file: File) {
    if (!files) return;

    const nextFiles = files.filter((item) => item.key !== file.key);
    setFiles(nextFiles);
    await saveFileCollection(config, nextFiles);
  }

  async function revalidate() {
    const loadedFiles = await loadFileCollection(config);
    setFiles(loadedFiles);
  }

  return {
    files: files || [],
    addFile,
    removeFile,
    isLoading: !files,
    revalidate,
  };
}
