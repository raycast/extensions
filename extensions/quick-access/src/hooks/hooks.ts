import { useCallback, useEffect, useState } from "react";
import { DirectoryInfo, DirectoryWithFileInfo } from "../utils/directory-info";
import {
  checkDirectoryValid,
  commonPreferences,
  getDirectoryFiles,
  getFileShowNumber,
  getLocalStorage,
  isEmpty,
} from "../utils/common-utils";
import { LocalStorageKey, SortBy } from "../utils/constants";
import { LocalStorage } from "@raycast/api";
import { runAppleScript } from "run-applescript";

//for refresh useState
export const refreshNumber = () => {
  return new Date().getTime();
};

//get local directory with files
export const localDirectoryWithFiles = (refresh: number) => {
  const [pinnedDirectory, setPinnedDirectory] = useState<DirectoryInfo[]>([]);
  const [directoryWithFiles, setDirectoryWithFiles] = useState<DirectoryWithFileInfo[]>([]);
  const [directoryTags, setDirectoryTags] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { fileShowNumber, sortBy } = commonPreferences();

  const fetchData = useCallback(async () => {
    const _localstorage = await getLocalStorage(LocalStorageKey.LOCAL_PIN_DIRECTORY);
    const localDirectory = isEmpty(_localstorage) ? [] : JSON.parse(_localstorage);
    setPinnedDirectory(localDirectory);

    //check if directory is valid
    const validDirectory = checkDirectoryValid(localDirectory);
    if (sortBy === SortBy.NameUp) {
      validDirectory.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    } else if (sortBy === SortBy.NameDown) {
      validDirectory.sort(function (a, b) {
        return b.name.localeCompare(a.name);
      });
    }

    //get directory tags
    const _directoryTags: string[] = [];
    //get directory files
    const _pinnedDirectoryContent: DirectoryWithFileInfo[] = [];
    const _fileShowNumber = getFileShowNumber(fileShowNumber);
    validDirectory.forEach((value) => {
      _directoryTags.push(value.name);
      _pinnedDirectoryContent.push({
        directory: value,
        files:
          _fileShowNumber === -1
            ? getDirectoryFiles(value.path + "/")
            : getDirectoryFiles(value.path + "/").slice(0, _fileShowNumber),
      });
    });
    setDirectoryTags(_directoryTags);
    setDirectoryWithFiles(_pinnedDirectoryContent);

    setLoading(false);
    await LocalStorage.setItem(LocalStorageKey.LOCAL_PIN_DIRECTORY, JSON.stringify(validDirectory));
    //init applescript
    await runAppleScript("");
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    pinnedDirectory: pinnedDirectory,
    directoryWithFiles: directoryWithFiles,
    directoryTags: directoryTags,
    loading: loading,
  };
};
