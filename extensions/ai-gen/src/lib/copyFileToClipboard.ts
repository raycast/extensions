import path from "path";
import { Clipboard } from "@raycast/api";

import downloadTempFile from "./downloadTempFile";

export default async function copyFileToClipboard(url: string, name?: string) {
  const file = await downloadTempFile(url, name);

  try {
    await Clipboard.copy({ file });
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to copy image: "${error.message}"`);
  }

  return path.basename(file);
}
