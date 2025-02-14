import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import type { File } from "../types";

const VISITED_FIGMA_FILES_KEY = "VISITED_FIGMA_FILES";
const VISITED_FIGMA_FILES_LENGTH = 5;

async function loadVisitedFiles() {
  const item = await LocalStorage.getItem<string>(VISITED_FIGMA_FILES_KEY);
  if (item) {
    const parsed = JSON.parse(item) as File[];
    return parsed;
  }
  return [];
}

async function saveVisitedFiles(file: File[]) {
  const data = JSON.stringify(file);
  await LocalStorage.setItem(VISITED_FIGMA_FILES_KEY, data);
}

export async function clearVisitedFiles() {
  return await LocalStorage.removeItem(VISITED_FIGMA_FILES_KEY);
}

export function useVisitedFiles() {
  const [files, setFiles] = useCachedState<File[]>("visitedFiles");

  useEffect(() => {
    loadVisitedFiles().then(setFiles);
  }, []);

  async function visitFile(file: File) {
    const nextFiles = [file, ...(files?.filter((item) => item.name !== file.name) ?? [])].slice(
      0,
      VISITED_FIGMA_FILES_LENGTH,
    );
    setFiles(nextFiles);
    await saveVisitedFiles(nextFiles);
  }

  return { files, visitFile, isLoading: !files };
}
