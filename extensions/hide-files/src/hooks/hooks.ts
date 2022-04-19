import { useCallback, useEffect, useState } from "react";
import { checkDirectoryValid, getLocalStorage, isEmpty } from "../utils/common-utils";
import { LocalStorageKey } from "../utils/constants";
import { DirectoryInfo, DirectoryType } from "../utils/directory-info";
import { LocalStorage } from "@raycast/api";

//for refresh useState
export const refreshNumber = () => {
  return new Date().getTime();
};

export const getHiddenFiles = (folderFirst: boolean, refresh: number) => {
  const [localHiddenDirectory, setLocalHiddenDirectory] = useState<DirectoryInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_HIDE_DIRECTORY);
    let localDirectory: DirectoryInfo[] = [];
    if (!isEmpty(_localstorage)) {
      localDirectory = JSON.parse(_localstorage) as DirectoryInfo[];
    }
    const localDirectoryReverse = localDirectory;
    const localFolder = localDirectoryReverse.filter((value) => value.type === DirectoryType.DIRECTORY);
    const localFile = localDirectoryReverse.filter((value) => value.type === DirectoryType.FILE);

    //check invalid directory
    const _validDirectory = checkDirectoryValid(
      folderFirst ? [...localFolder, ...localFile] : [...localFile, ...localFolder]
    );
    setLocalHiddenDirectory(_validDirectory);
    setLoading(false);
    await LocalStorage.setItem(LocalStorageKey.LOCAL_HIDE_DIRECTORY, JSON.stringify(_validDirectory));
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { localHiddenDirectory: localHiddenDirectory, loading: loading };
};
