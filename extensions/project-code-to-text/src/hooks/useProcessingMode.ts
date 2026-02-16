import { useState, useEffect } from "react";
import type { FinderSelectionInfo } from "../types";

/**
 * Hook to manage processing mode based on Finder selection and user preferences.
 * Automatically updates when finder selection or directory mode changes.
 */
export function useProcessingMode(
  finderSelectionInfo: FinderSelectionInfo | null,
  useDirectoryInsteadOfFiles: boolean,
) {
  const [processOnlySelectedFiles, setProcessOnlySelectedFiles] = useState(false);
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);

  useEffect(() => {
    if (finderSelectionInfo) {
      const shouldUseFiles = Boolean(finderSelectionInfo.hasFiles && !useDirectoryInsteadOfFiles);
      setProcessOnlySelectedFiles(shouldUseFiles);
      setSelectedFilePaths(shouldUseFiles ? finderSelectionInfo.selectedFiles || [] : []);
    }
  }, [finderSelectionInfo, useDirectoryInsteadOfFiles]);

  return {
    processOnlySelectedFiles,
    selectedFilePaths,
    setProcessOnlySelectedFiles,
    setSelectedFilePaths,
  };
}
