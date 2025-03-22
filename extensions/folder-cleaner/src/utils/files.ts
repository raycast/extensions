import { captureException } from "@raycast/api";
import { existsSync, lstatSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildException } from "./buildException";

type isFileArgs = {
  filename: string;
  folderPath: string;
};

export const isFile = ({ filename, folderPath }: isFileArgs) => {
  try {
    const filePath = join(folderPath, filename);
    return lstatSync(filePath).isFile();
  } catch {
    return false;
  }
};

type moveOrDeleteArgs = {
  file: string;
  currentPath: string;
  folderPath: string;
};

export const moveOrDelete = ({ file, currentPath, folderPath }: moveOrDeleteArgs) => {
  try {
    const newPath = join(folderPath, file);

    if (!existsSync(newPath)) {
      renameSync(currentPath, newPath);
    } else {
      rmSync(currentPath);
    }
  } catch (error) {
    captureException(buildException(error as Error, "Failed to move file", { file, currentPath, folderPath }));
  }
};
