import path from "path";
import fsPromises from "fs/promises";
import fs from "fs";
import ignoreManager from "./ignore-manager";

export const isBinaryOrMediaFile = (fileName: string): boolean => {
  return ignoreManager.isBinaryFile(fileName);
};

export const isIgnoredItem = (itemPath: string, basePath: string, isDirectory: boolean): boolean => {
  return ignoreManager.shouldIgnore(itemPath, basePath, isDirectory);
};

export const readDirectoryContents = async (
  dirPath: string,
  basePath: string = "",
  rootPath: string = "",
): Promise<string> => {
  const actualRootPath = rootPath || dirPath;
  let content = "";
  const items = await fsPromises.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const itemName = item.name;
    const itemPath = path.join(dirPath, itemName);
    const relativePath = path.join(basePath, itemName);

    if (isIgnoredItem(itemPath, actualRootPath, item.isDirectory())) {
      content += `File: ${relativePath} (content ignored)\n\n`;
    } else if (item.isDirectory()) {
      content += await readDirectoryContents(itemPath, relativePath, actualRootPath);
    } else {
      try {
        const fileContent = await fsPromises.readFile(itemPath, "utf-8");
        content += `File: ${relativePath}\n${fileContent}\n\n`;
      } catch {
        content += `File: ${relativePath} (read failed)\n\n`;
      }
    }
  }

  return content;
};

export const readDirectoryContentsSync = (dirPath: string, basePath: string = "", rootPath: string = ""): string => {
  const actualRootPath = rootPath || dirPath;
  let content = "";

  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemName = item.name;
      const itemPath = path.join(dirPath, itemName);
      const relativePath = path.join(basePath, itemName);

      if (ignoreManager.shouldIgnore(itemPath, actualRootPath, item.isDirectory())) {
        if (item.isDirectory()) {
          content += `Directory: ${relativePath} (ignored)\n\n`;
        } else if (item.isFile()) {
          content += `File: ${relativePath} (ignored)\n\n`;
        }
        continue;
      }

      try {
        if (item.isDirectory()) {
          content += `Directory: ${relativePath}${path.sep}\n`;
          content += readDirectoryContentsSync(itemPath, relativePath, actualRootPath);
        } else if (item.isFile()) {
          if (ignoreManager.isBinaryFile(itemPath)) {
            content += `File: ${relativePath} (binary/media, content ignored)\n\n`;
          } else {
            const fileContent = fs.readFileSync(itemPath, "utf-8");
            content += `File: ${relativePath}\n${fileContent}\n\n`;
          }
        }
      } catch (readError) {
        console.warn(`Warning: Could not read item ${itemPath}:`, readError);
        content += `Item: ${relativePath} (read failed)\n\n`;
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    content += `Error reading directory: ${basePath || dirPath}\n\n`;
  }

  return content;
};
