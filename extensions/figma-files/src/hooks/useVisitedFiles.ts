import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import { useState, useEffect } from "react";
import type { File } from "../types";

const VISITED_FIGMA_FILES_KEY = "VISITED_FIGMA_FILES";
const VISITED_FIGMA_FILES_LENGTH = 5;

async function loadVisitedFiles() {
  const item = await getLocalStorageItem<string>(VISITED_FIGMA_FILES_KEY);
  if (item) {
    const parsed = JSON.parse(item);
    return parsed as File[];
  } else {
    return [];
  }
}

async function saveVisitedFiles(file: File[]) {
  const data = JSON.stringify(file);
  await setLocalStorageItem(VISITED_FIGMA_FILES_KEY, data);
}

export async function clearVisitedFiles() {
  return await removeLocalStorageItem(VISITED_FIGMA_FILES_KEY);
}

export function useVisitedFiles() {
  const [files, setFiles] = useState<File[]>();

  useEffect(() => {
    loadVisitedFiles().then(setFiles);
  }, []);

  function visitFile(file: File) {
    const nextFiles = [file, ...(files?.filter((item) => item !== file) ?? [])].slice(0, VISITED_FIGMA_FILES_LENGTH);
    setFiles(nextFiles);
    saveVisitedFiles(nextFiles);
  }

  return { files, visitFile, isLoading: !files };
}
