import fs from "fs";
import path from "path";
import filetype from "magic-bytes.js";

export const getFilePath = (directory: string, filename: string): string => {
  const files = fs.readdirSync(directory);
  const fileSet = new Set(files);

  for (let increment = 0; increment < MaxInt32; increment++) {
    const name = `${path.basename(filename, path.extname(filename))}${increment || ""}${path.extname(filename)}`;
    const initialPath = path.join(directory, name);
    if (!fileSet.has(name)) {
      return initialPath;
    }
  }
  return path.join(directory, filename);
};

export const MaxInt32 = 2147483647;

export const validateFileType = (filepath: string, expectedType: string): boolean => {
  const types = filetype(fs.readFileSync(filepath));
  if (types.length == 0) {
    //   fallback to extension in filename
    const fileExtension = path.extname(filepath);
    return fileExtension == `.${expectedType}`;
  }
  const type = types[0].typename || types[0].extension;
  return type == expectedType;
};
