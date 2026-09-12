import { useFileCollection } from "./useFileCollection";
import type { File } from "../types";

import { STARRED_CONFIG } from "../lib/fileStorage";

export function useStarredFiles() {
  const { files, addFile, removeFile, isLoading, revalidate } = useFileCollection(STARRED_CONFIG);

  async function starFile(file: File) {
    await addFile(file);
  }

  async function unstarFile(file: File) {
    await removeFile(file);
  }

  const isStarred = (file: File) => {
    return files.some((item) => item.key === file.key);
  };

  return {
    files,
    starFile,
    unstarFile,
    isStarred,
    isLoading,
    revalidate,
  };
}
