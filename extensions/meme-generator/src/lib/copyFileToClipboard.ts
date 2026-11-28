import { Clipboard } from "@raycast/api";
import fetch from "node-fetch";
import path from "path";
import { FileOptions, temporaryWrite } from "tempy";

// Windows rejects these characters, and trailing dots or spaces, in file names
function sanitizeFilename(name: string): string {
  const ext = path.extname(name);
  const base = name
    .slice(0, name.length - ext.length)
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/[. ]+$/, "")
    .trim();
  return `${base || "meme"}${ext}`;
}

export default async function copyFileToClipboard(url: string, name?: string) {
  const response = await fetch(url);

  if (response.status !== 200) {
    throw new Error(`Meme file download failed. Server responded with ${response.status}`);
  }

  if (response.body === null) {
    throw new Error("Unable to read Meme response");
  }

  let tempyOpt: FileOptions;
  if (name) {
    tempyOpt = { name: sanitizeFilename(name) };
  } else {
    tempyOpt = { extension: ".jpg" };
  }

  let file: string;
  try {
    file = await temporaryWrite(await response.body, tempyOpt);
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to download Meme: "${error.message}"`);
  }

  try {
    await Clipboard.copy({ file });
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to copy Meme: "${error.message}"`);
  }

  return path.basename(file);
}
