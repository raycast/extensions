import { captureException } from "@raycast/api";
import { existsSync, lstatSync, renameSync } from "node:fs";
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
  const newPath = join(folderPath, file);

  try {
    if (!existsSync(newPath)) {
      renameSync(currentPath, newPath);
    } else {
      // TODO: The file already exists, how do we handle this situation?
      // TODO: Should I prompt the user to replace or rename?
    }
  } catch (error) {
    captureException(buildException(error as Error, "Failed to move file", { currentPath, newPath }));
  }
};
