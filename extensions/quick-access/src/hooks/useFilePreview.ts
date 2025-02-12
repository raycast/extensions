import { useCachedPromise } from "@raycast/utils";
import { FileInfo } from "../types/types";
import { getFileContent } from "../utils/get-file-preview";

export function useFilePreview(fileInfo: FileInfo | undefined) {
  return useCachedPromise(
    (fileInfo: FileInfo | undefined) => {
      return getFileContent(fileInfo);
    },
    [fileInfo],
  );
}
