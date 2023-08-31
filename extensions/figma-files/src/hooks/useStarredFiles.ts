import { useCachedState } from "@raycast/utils";
import { LocalStorage } from "@raycast/api";
import { useEffect } from "react";
import { File } from "../types";
const STARRED_FILES_KEY = "favourite-files";
const STARRED_FILES_LIMIT = 10;

//functions for favouriting files
export async function loadStarredFiles() {
  const item = await LocalStorage.getItem<string>(STARRED_FILES_KEY);
  if (item) {
    const parsed = JSON.parse(item) as File[];
    return parsed;
  } else {
    return [];
  }
}

export async function saveStarredFile(file: File) {
  const parsedFiles = await loadStarredFiles();
  if (parsedFiles.length >= STARRED_FILES_LIMIT) {
    return;
  }
  parsedFiles.push(file);
  const data = JSON.stringify(parsedFiles);
  await LocalStorage.setItem(STARRED_FILES_KEY, data);
}

export async function removeStarredFile(file: File) {
  const parsedFiles = await loadStarredFiles();
  const nextFiles = parsedFiles.filter((item) => item.name !== file.name);
  const data = JSON.stringify(nextFiles);
  await LocalStorage.setItem(STARRED_FILES_KEY, data);
}

export function useStarredFiles() {
  const [starredFiles, setStarredFiles] = useCachedState<File[]>("StarredFiles");
  const [starredFilesCount, setStarredFilesCount] = useCachedState<number>("StarredFilesCount");

  useEffect(() => {
    async function starredFilesSetting() {
      const files = await loadStarredFiles();
      setStarredFiles(files);
      setStarredFilesCount(files.length);
    }
    starredFilesSetting();
  }, []);

  return { starredFiles, starredFilesCount, isLoading: !starredFiles };
}
