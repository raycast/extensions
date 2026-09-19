import { Clipboard, environment } from "@raycast/api";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { showFailureToast } from "@raycast/utils";

const folderName = "posters";

export async function downloadImage(url: string, downloadPath: string) {
  const dir = downloadPath && downloadPath.trim().length > 0 ? downloadPath : path.join(os.homedir(), "Downloads");
  const targetPath = path.join(dir, path.basename(url));
  try {
    const buffer = Buffer.from(await (await fetch(url)).arrayBuffer());
    await fs.writeFile(targetPath, buffer);
    return targetPath;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not download file` });
  }
}

export async function copyImage(url: string) {
  await fs.mkdir(path.join(environment.supportPath, folderName), { recursive: true });
  const downloadPath = path.join(environment.supportPath, folderName);
  const filePath = await downloadImage(url, downloadPath);
  try {
    const fileContent: Clipboard.Content = { file: filePath ?? "" };
    await Clipboard.copy(fileContent);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not copy file '${filePath}'` });
  }
}
