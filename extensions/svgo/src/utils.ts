import fs from "fs";

import { FileSystemItem } from "@raycast/api";
import isSvg from "is-svg";
import { optimize, PluginConfig } from "svgo";

interface SVGItem {
  data: string;
  path: string;
}

/**
 * Modifies the file path based on the presence of a file extension.
 * If the file name has a file extension, it inserts the string "min" into the
 * file path at the position before the file extension.
 * If the file name has no file extension, it appends the string ".min.svg"
 * to the file name.
 * @param {string} path - The absolute file path.
 * @returns {string} The modified file path.
 * @example
 * processFilePath('/path/to/file.svg')
 * // => "/path/to/file.min.txt"
 * processFilePath('/path/to/file'));
 * // => "/path/to/file.min.svg"
 */
const processFilePath = async (path: string) => {
  const filenameStartIdx = path.lastIndexOf("/") + 1;
  const fileExtensionIdx = path.lastIndexOf(".");
  const hasFileExtension = fileExtensionIdx > filenameStartIdx;

  if (hasFileExtension) {
    const filename = path.substring(filenameStartIdx, fileExtensionIdx);
    const fileExtension = path.substring(fileExtensionIdx);

    return `${path.substring(0, filenameStartIdx)}${filename}.min${fileExtension}`;
  } else {
    return `${path}.min.svg`;
  }
};

/**
 * Asynchronously processes a list of files, modifying the file paths and
 * writing the file contents.
 * @param {Array<{ data: string, path: string }>} list - The list of files.
 * @returns {Promise<void>} A promise that resolves when all files have been processed.
 */
const processFileList = async (list: SVGItem[]) => {
  for (const svg of list) {
    const target = await processFilePath(svg.path);

    await fs.promises.writeFile(target, svg.data);
  }
};

/**
 * Asynchronously optimizes selected SVG files and writes the optimized files
 * to the file system.
 * @param {FileSystemItem[]} items - The list of Finder items.
 * @returns {Promise<void>} A promise that resolves when all items have been optimized and processed.
 */
const optimizeItems = async (items: FileSystemItem[], plugins: PluginConfig[]) => {
  const promises = items.map(
    ({ path }) =>
      new Promise<SVGItem>((resolve, reject) => {
        const isFile = fs.lstatSync(path).isFile();
        const content = isFile ? fs.readFileSync(path, "utf8") : null;

        if (content && isSvg(content)) {
          const result = optimize(content, { plugins });
          resolve({ data: result.data, path });
        } else {
          reject(`Selected item is not a SVG:\n\n${path}`);
        }
      })
  );

  const list = await Promise.all(promises);

  await processFileList(list);
};

export default optimizeItems;
