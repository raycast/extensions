import fs from "fs";
import path from "path";

export const getFilePath = (directory: string, filename: string, ): string => {
  const files = fs.readdirSync(directory);
  const fileSet = new Set(files);

  for(let increment=0; increment<MaxInt32;increment++)
  {
    const name = `${path.basename(filename, path.extname(filename))}${increment || ""}${path.extname(filename)}`;
    const initialPath = path.join(directory, name);
    if (!fileSet.has(name)) {
      return initialPath;
    }
  }
  return path.join(directory, filename);

};

export const MaxInt32 = 2147483647;
