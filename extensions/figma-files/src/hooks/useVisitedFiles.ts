import { useFileCollection } from "./useFileCollection";
import type { File } from "../types";

import { VISITED_CONFIG } from "../lib/fileStorage";

export function useVisitedFiles() {
  const { files, addFile, isLoading, revalidate } = useFileCollection(VISITED_CONFIG);

  async function visitFile(file: File) {
    await addFile(file);
  }

  return { files, visitFile, isLoading, revalidate };
}
