import fetch from "node-fetch";
import { temporaryWrite, FileOptions } from "tempy";

export default async function downloadTempFile(url: string, name?: string) {
  const response = await fetch(url);

  if (response.status !== 200) {
    throw new Error(`File download failed. Server responded with ${response.status}`);
  }

  if (response.body === null) {
    throw new Error("Unable to read image response");
  }

  let tempyOpt: FileOptions;
  if (name) {
    tempyOpt = { name };
  } else {
    tempyOpt = { extension: ".png" };
  }

  let file: string;
  try {
    file = await temporaryWrite(await response.body, tempyOpt);
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to download image: "${error.message}"`);
  }

  return file;
}
