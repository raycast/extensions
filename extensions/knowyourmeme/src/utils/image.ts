import { Clipboard } from "@raycast/api";
import axios from "axios";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { fileTypeFromBuffer } from "file-type";

export async function downloadImage(url: string, downloadPath?: string) {
  const dir = downloadPath && downloadPath.trim().length > 0 ? downloadPath : path.join(os.homedir(), "Downloads");

  const response = await axios.get(url, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data);

  const type = await fileTypeFromBuffer(buffer);

  const baseName = path.basename(url).split("?")[0];

  const hasExtension = path.extname(baseName).length > 0;
  const finalName = hasExtension ? baseName : type ? `${baseName || "image"}.${type.ext}` : `${baseName || "image"}`;

  const targetPath = path.join(dir, finalName);

  await fs.writeFile(targetPath, buffer);

  return targetPath;
}

export async function copyImage(url: string) {
  await fs.mkdir(path.join(os.tmpdir(), "knowyourmeme-raycast"), { recursive: true });
  const downloadPath = path.join(os.tmpdir(), "knowyourmeme-raycast");
  const filePath = await downloadImage(url, downloadPath);
  try {
    const fileContent: Clipboard.Content = { file: filePath };
    await Clipboard.copy(fileContent);
  } catch (error) {
    console.error(`Could not copy file '${filePath}'. Reason: ${error}`);
  }
}
