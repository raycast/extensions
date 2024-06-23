import { FileSystemItem } from "@raycast/api";

export const isMoreThan2Files = async (files: FileSystemItem[]) => {
  if (files.length < 2) {
    throw new Error("Select more than 2 image files");
  }
  return true;
};
