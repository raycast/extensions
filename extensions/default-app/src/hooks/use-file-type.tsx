import { useCachedPromise } from "@raycast/utils";
import { getUniformType } from "../utitlities/swift/get-uniform-type";

export function useFileType(filePath: string | undefined) {
  const { data, isLoading, mutate, revalidate, error } = useCachedPromise(getUniformType, [filePath ?? ""], {
    execute: filePath !== undefined,
  });

  return {
    fileType: filePath !== undefined ? data : undefined,
    isLoadingFileType: isLoading,
    mutateFileType: mutate,
    revalidateFileType: revalidate,
    fileTypeError: error,
  };
}
