import fetch from "node-fetch";
import path from "path";
import { runAppleScript } from "run-applescript";
import { FileOptions, temporaryWrite } from "tempy";

export default async function copyFileToClipboard(url: string, name?: string) {
  const response = await fetch(url);

  if (response.status !== 200) {
    throw new Error(`GIF file download failed. Server responded with ${response.status}`);
  }

  if (response.blob() === null) {
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
    const body = await response.body;
    if (body) file = await temporaryWrite(body, tempyOpt);
    else throw { message: "Something Wrong!" };
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
