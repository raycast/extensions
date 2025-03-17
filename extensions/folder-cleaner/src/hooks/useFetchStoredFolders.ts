import { captureException, LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Folder } from "../types/folders";
import { buildException } from "../utils/buildException";

export const useFetchStoredFolders = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);

  const refetchFolders = useCallback(async () => {
    const storedFoldersObject = await LocalStorage.allItems<Record<string, string>>();
    if (!Object.keys(storedFoldersObject).length) {
      setFolders([]);
      return;
    }

    const storedFolders: Folder[] = [];

    for (const key in storedFoldersObject) {
      try {
        storedFolders.push(JSON.parse(storedFoldersObject[key]));
      } catch (error) {
        captureException(
          buildException(error as Error, "Error parsing stored folders from local storage", {
            folderId: key,
            localStorage: storedFoldersObject,
          }),
        );
      }
    }

    setFolders(storedFolders);
  }, []);

  useEffect(() => {
    setIsLoading(true);

    refetchFolders().finally(() => {
      setIsLoading(false);
    });
  }, [refetchFolders]);

  return {
    folders,
    setFolders,
    isLoading,
    refetchFolders,
  };
};
