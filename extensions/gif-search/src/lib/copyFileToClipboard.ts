import fetch from "node-fetch";
import path from "path";
import { Clipboard } from "@raycast/api";
import tempy, { FileOptions } from "tempy";
import { getGifFromCache, saveGifToCache } from "./cachedGifs";
import { getHideFilename } from "../preferences";

export default async function copyFileToClipboard(url: string, name?: string, isFavorite?: boolean) {
  const hideFilename = getHideFilename();
  let fileName = hideFilename ? "gif.gif" : name || path.basename(url);
  
  // Ensure the file has a .gif extension
  if (!fileName.toLowerCase().endsWith('.gif')) {
    // If the filename doesn't have an extension or has a different extension, add .gif
    const hasExtension = path.extname(fileName);
    if (hasExtension) {
      // Replace the existing extension with .gif
      fileName = path.basename(fileName, hasExtension) + '.gif';
    } else {
      // Add .gif extension
      fileName = fileName + '.gif';
    }
  }

  // Check if the file exists in the cache - if so use it directly
  const cachedFile = await getGifFromCache(fileName);
  if (cachedFile) {
    await copyToClipboard(cachedFile);
    return fileName;
  }

  // Download the file if it's not found in the cache
  const response = await fetch(url);

  if (response.status !== 200) {
    throw new Error(`GIF file download failed. Server responded with ${response.status}`);
  }

  if (response.body === null) {
    throw new Error("Unable to read GIF response");
  }

  let tempyOpt: FileOptions;
  if (name) {
    tempyOpt = { name: fileName };
  } else {
    tempyOpt = { extension: ".gif" };
  }

  let file: string;
  try {
    file = await tempy.write(await response.body, tempyOpt);
    if (isFavorite) {
      await saveGifToCache(file, fileName);
    }
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to download GIF: "${error.message}"`);
  }

  await copyToClipboard(file);
  return path.basename(file);
}

async function copyToClipboard(file: string) {
  try {
    await Clipboard.copy({ file });
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to copy GIF: "${error.message}"`);
  }
}
