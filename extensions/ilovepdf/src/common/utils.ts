import fs from "fs";
import path from "path";

export const getFilePath = (directory: string, filename: string, increment = 0): string => {
  const name = `${path.basename(filename, path.extname(filename))}${increment || ""}${path.extname(filename)}`;
  const initialPath = path.join(directory, name);
  if (!fs.existsSync(initialPath)) {
    return initialPath;
  }

  return getFilePath(directory, filename, increment + 1);
};
