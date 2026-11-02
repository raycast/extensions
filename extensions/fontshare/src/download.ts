import { open, showInFinder, showToast, Toast } from "@raycast/api";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { fetchFontshare } from "./api";

const SHOW_FILE_TITLE = process.platform === "darwin" ? "Show in Finder" : "Show in Explorer";

function fileNameFrom(response: Response, fallback: string): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const name = /filename="?([^";]+)"?/i.exec(disposition)?.[1];
  // basename() drops any path a malicious header could carry.
  return basename(name?.trim() || fallback);
}

/**
 * Writes `data` under the first free name: "Satoshi_Complete.zip", then "Satoshi_Complete 2.zip"… The exclusive
 * create ("wx") makes the check and the write one step, so concurrent downloads never overwrite each other.
 */
async function writeToFreePath(dir: string, fileName: string, data: Buffer): Promise<string> {
  const extension = extname(fileName);
  const stem = fileName.slice(0, fileName.length - extension.length);
  for (let index = 1; ; index++) {
    const candidate = join(dir, index === 1 ? fileName : `${stem} ${index}${extension}`);
    try {
      await writeFile(candidate, data, { flag: "wx" });
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}

/** Downloads a Fontshare zip to the user's Downloads folder and reports progress with a toast. */
export async function downloadZip(url: string, title: string, fallbackFileName: string): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Downloading ${title}…` });

  try {
    const response = await fetchFontshare(url);
    const dir = join(homedir(), "Downloads");
    await mkdir(dir, { recursive: true });
    const data = Buffer.from(await response.arrayBuffer());
    const file = await writeToFreePath(dir, fileNameFrom(response, fallbackFileName), data);

    toast.style = Toast.Style.Success;
    toast.title = `Downloaded ${title}`;
    toast.message = basename(file);
    toast.primaryAction = { title: SHOW_FILE_TITLE, onAction: () => showInFinder(file) };
    toast.secondaryAction = { title: "Open", onAction: () => open(file) };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Could not download ${title}`;
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
