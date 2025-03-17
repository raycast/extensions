import { captureException } from "@raycast/api";
import { useEffect, useState } from "react";
import { readdir } from "node:fs/promises";
import { isFile } from "../utils/files";
import { buildException } from "../utils/buildException";

export const useFetchFolderFiles = (folderToClean: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [folderFiles, setFolderFiles] = useState<string[]>([]);

  useEffect(() => {
    setIsLoading(true);

    const fetchFolderFiles = async () => {
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
    };

    void fetchFolderFiles();
  }, [folderToClean]);

  return {
    folderFiles,
    isLoading,
  };
};
