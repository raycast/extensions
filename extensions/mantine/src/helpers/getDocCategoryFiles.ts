import fs from "fs";

export const getDocCategoryFiles = async (directory: string) => {
  try {
    const files = await fs.promises.readdir(__dirname + directory, "utf-8");

    return files;
  } catch (e) {
    throw new Error(`Failed reading ${__dirname + directory} files`);
  }
};
