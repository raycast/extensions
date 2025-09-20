import axios from "axios";
import { temporaryWrite, FileOptions } from "tempy";

export default async function downloadTempFile(url: string, name?: string) {
  const { status, data } = await axios(url, { responseType: "arraybuffer" });

  if (status !== 200) {
    throw new Error(`File download failed. Server responded with ${status}`);
  }

  if (data === null) {
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
    file = await temporaryWrite(data, tempyOpt);
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to download image: "${error.message}"`);
  }

  return file;
}
