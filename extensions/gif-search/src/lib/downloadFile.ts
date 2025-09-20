import { getPreferenceValues } from "@raycast/api";
import { copyFileSync, createWriteStream, existsSync } from "fs";
import fetch from "node-fetch";
import { homedir } from "os";
import { getGifFromCache } from "./cachedGifs";
import { getHideFilename } from "../preferences";
import path from "path";

const { downloadPath } = getPreferenceValues();
const basePath = downloadPath || `${homedir()}/Downloads`;

export default async function downloadFile(url: string, name: string) {
  const hideFilename = getHideFilename();
  const fileName = hideFilename ? "gif.gif" : name || path.basename(url);

  // Check if the file exists in the cache - if so use it directly
  try {
    const cachedFile = await getGifFromCache(fileName);
    if (cachedFile) {
      const destinationPath = path.join(basePath, fileName);
      copyFileSync(cachedFile, destinationPath);
      return destinationPath;
    }
  } catch (error) {
    console.error("Error retrieving file from cache:", error);
  }

  // If the file is not found in the cache, download it
  const response = await fetch(url);

  if (!response.body) {
    throw new Error();
  }

  let filePath = `${basePath}/${fileName}`;

  // Prevent overriding existing files with the same name
  if (existsSync(filePath)) {
    let counter = 1;
    const fileNameWithoutExtension = fileName.split(".")[0];
    const fileExtension = fileName.split(".")[1];

    do {
      filePath = `${basePath}/${fileNameWithoutExtension} (${counter}).${fileExtension}`;
      counter++;
    } while (existsSync(filePath));
  } else {
    const fileStream = createWriteStream(filePath);
    await response.body?.pipe(fileStream);
  }

  const fileStream = createWriteStream(filePath);
  response.body?.pipe(fileStream);

  return new Promise((resolve, reject) => {
    fileStream.on("finish", () => {
      return resolve(filePath);
    });

    fileStream.on("error", () => {
      return reject();
    });
  });
}
