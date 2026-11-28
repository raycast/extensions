import { Clipboard, environment } from "@raycast/api";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { fileTypeFromBuffer } from "file-type";
import { showFailureToast } from "@raycast/utils";

const folderName = "images";

export async function downloadImage(url: string, downloadPath?: string) {
  const dir = downloadPath && downloadPath.trim().length > 0 ? downloadPath : path.join(os.homedir(), "Downloads");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  const type = await fileTypeFromBuffer(buffer);

  const baseName = path.basename(url).split("?")[0];

  const hasExtension = path.extname(baseName).length > 0;
  const finalName = hasExtension ? baseName : type ? `${baseName || "image"}.${type.ext}` : `${baseName || "image"}`;

  const targetPath = path.join(dir, finalName);

  await fs.writeFile(targetPath, buffer);

  return targetPath;
}

export async function copyImage(url: string) {
  await fs.mkdir(path.join(environment.supportPath, folderName), { recursive: true });
  const downloadPath = path.join(environment.supportPath, folderName);
  const filePath = await downloadImage(url, downloadPath);
  try {
    const fileContent: Clipboard.Content = { file: filePath };
    await Clipboard.copy(fileContent);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not copy file '${filePath}'` });
  }
}
