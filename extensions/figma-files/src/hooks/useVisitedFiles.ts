import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import type { File } from "../types";

const VISITED_FIGMA_FILES_KEY = "VISITED_FIGMA_FILES";
const VISITED_FIGMA_FILES_LENGTH = 5;
const FAVOURITE_FILES_KEY = "favourite-files";
const FAVOURITE_FILES_LIMIT = 5;

//functions for favouriting files
export async function loadFavouriteFiles() {
  const item = await LocalStorage.getItem<string>(FAVOURITE_FILES_KEY);
  if (item) {
    const parsed = JSON.parse(item) as File[];
    return parsed;
  } else {
    return [];
  }
}

export async function saveFavouriteFiles(file: File) {
  const item = await LocalStorage.getItem<string>(FAVOURITE_FILES_KEY);
  let parsedFiles: File[] = [];
  if (item) {
    parsedFiles = JSON.parse(item) as File[];
  }
  parsedFiles.push(file);
  const data = JSON.stringify(parsedFiles);
  await LocalStorage.setItem(FAVOURITE_FILES_KEY, data);
}

export async function clearFavouriteFiles() {
  return await LocalStorage.removeItem(FAVOURITE_FILES_KEY);
}

//functions for visited files
async function loadVisitedFiles() {
  const item = await LocalStorage.getItem<string>(VISITED_FIGMA_FILES_KEY);
  if (item) {
    const parsed = JSON.parse(item) as File[];
    return parsed;
  } else {
    return [];
  }
}

async function saveVisitedFiles(file: File[]) {
  const data = JSON.stringify(file);
  await LocalStorage.setItem(VISITED_FIGMA_FILES_KEY, data);
}

export async function clearVisitedFiles() {
  return await LocalStorage.removeItem(VISITED_FIGMA_FILES_KEY);
}

export function useVisitedFavouriteFiles() {
  const [files, setFiles] = useCachedState<File[]>("visitedFiles");
  const [favFiles, setFavFiles] = useCachedState<File[]>("favouriteFiles");

  useEffect(() => {
    loadVisitedFiles().then(setFiles);
  }, []);

  async function visitFile(file: File) {
    const nextFiles = [file, ...(files?.filter((item) => item.name !== file.name) ?? [])].slice(
      0,
      VISITED_FIGMA_FILES_LENGTH
    );
    setFiles(nextFiles);
    await saveVisitedFiles(nextFiles);
  }

  return { files, visitFile, isLoading: !files };
}
