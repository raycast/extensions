import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export async function downloadToDownloads(sourcePath: string, baseName: string): Promise<void> {
  try {
    const downloads = path.join(os.homedir(), "Downloads");
    await fs.mkdir(downloads, { recursive: true });
    const dest = await uniquePath(path.join(downloads, `${baseName || "landsat"}.png`));
    await fs.copyFile(sourcePath, dest);
    await showToast({ style: Toast.Style.Success, title: "Downloaded", message: dest });
  } catch (e) {
    await showFailureToast(e, { title: "Download failed" });
  }
}

async function uniquePath(desired: string): Promise<string> {
  const ext = path.extname(desired);
  const base = desired.slice(0, -ext.length);
  let candidate = desired;
  let i = 1;
  while (await exists(candidate)) {
    candidate = `${base} (${i})${ext}`;
    i++;
  }
  return candidate;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
