import { Clipboard, environment } from "@raycast/api";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

const folderName = "posters";

export async function downloadImage(url: string, downloadPath: string) {
  const dir = downloadPath && downloadPath.trim().length > 0 ? downloadPath : path.join(os.homedir(), "Downloads");
  const targetPath = path.join(dir, path.basename(url));
  try {
    const buffer = Buffer.from(await (await fetch(url)).arrayBuffer());
    await fs.writeFile(targetPath, buffer);
    return targetPath;
  } catch (error) {
    throw new Error(`Could not download file. Reason: ${error}`);
  }
}

export async function copyImage(url: string) {
  await fs.mkdir(path.join(environment.supportPath, folderName), { recursive: true });
  const downloadPath = path.join(environment.supportPath, folderName);
  const filePath = await downloadImage(url, downloadPath);
  try {
    const fileContent: Clipboard.Content = { file: filePath };
    await Clipboard.copy(fileContent);
  } catch (error) {
    throw new Error(`Could not copy file '${filePath}. Reason: ${error}'`);
  }
}
