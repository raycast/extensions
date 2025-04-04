import { captureException, getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { readdir } from "node:fs/promises";
import { isFile } from "../utils/files";
import { buildException } from "../utils/buildException";

export const useFetchFolderFiles = () => {
  const { folderToClean } = getPreferenceValues();

  const [isLoading, setIsLoading] = useState(true);
  const [folderFiles, setFolderFiles] = useState<string[]>([]);

  const fetchFolderFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const folder = await readdir(folderToClean);
      const folderFiles = folder.filter((file) => {
        return isFile({ filename: file, folderPath: folderToClean });
      });

      setFolderFiles(folderFiles);
    } catch (error) {
      captureException(
        buildException(error as Error, "Error fetching files from folder", {
          folderToClean,
        }),
      );
    } finally {
      setIsLoading(false);
    }
  }, [folderToClean]);

  useEffect(() => {
    void fetchFolderFiles();
  }, [fetchFolderFiles]);

  return {
    folderFiles,
    isLoading,
    fetchFolderFiles,
  };
};
