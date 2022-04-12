import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import { runAppleScript } from "run-applescript";
import tempy, { FileOptions } from "tempy";

import { showHUD } from "@raycast/api";

export default async function copyFileToClipboard(url: string, name?: string) {
  const response = await fetch(url);

  if (response.status !== 200) {
    await showHUD(`GIF file download failed. Server responded with ${response.status}`);
    return;
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

  const file = tempy.file(tempyOpt);
  response.body.pipe(fs.createWriteStream(file));

  await runAppleScript(`tell app "Finder" to set the clipboard to ( POSIX file "${file}" )`);
  return path.basename(file);
}
