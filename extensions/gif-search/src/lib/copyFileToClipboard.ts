import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import { runAppleScript } from "run-applescript";
import tempy, { FileOptions } from "tempy";

export default async function copyFileToClipboard(url: string, name?: string) {
  const response = await fetch(url);

  if (response.status !== 200) {
    throw new Error(`GIF file download failed. Server responded with ${response.status}`);
  }

  if (response.body === null) {
    throw new Error("Unable to read GIF response");
  }

  let tempyOpt: FileOptions;
  if (name) {
    tempyOpt = { name };
  } else {
    tempyOpt = { extension: ".gif" };
  }

  let file: string;
  try {
    file = await tempy.write(await response.body, tempyOpt);
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to download GIF: "${error.message}"`);
  }

  try {
    await runAppleScript(`tell app "Finder" to set the clipboard to ( POSIX file "${file}" )`);
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to copy GIF: "${error.message}"`);
  }

  return path.basename(file);
}
