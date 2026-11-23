import { showToast, Toast } from "@raycast/api";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { isImage, openInSnapApp, requireSnapApp, run, runCommand } from "./snapapp";

// Where macOS saves screenshots: the folder set in the Screenshot app's Options, else the Desktop.
async function screenshotFolder(): Promise<string> {
  try {
    const { stdout } = await run("/usr/bin/defaults", ["read", "com.apple.screencapture", "location"]);
    const folder = stdout.trim().replace(/^~(?=$|\/)/, homedir());
    if (folder) return folder;
  } catch {
    // No custom location is set: macOS saves to the Desktop.
  }
  return join(homedir(), "Desktop");
}

// macOS marks every screenshot it saves with this attribute, whatever language names the file.
async function isScreenshot(path: string): Promise<boolean> {
  try {
    await run("/usr/bin/xattr", ["-p", "com.apple.metadata:kMDItemIsScreenCapture", path]);
    return true;
  } catch {
    return false;
  }
}

async function newestScreenshot(folder: string): Promise<string | undefined> {
  const images: { path: string; time: number }[] = [];
  for (const name of await readdir(folder)) {
    if (name.startsWith(".") || !isImage(name)) continue;
    const path = join(folder, name);
    try {
      const info = await stat(path);
      if (info.isFile()) images.push({ path, time: info.mtimeMs });
    } catch {
      // A file that vanished or a broken link is skipped; the others still count.
    }
  }
  images.sort((a, b) => b.time - a.time);
  for (const image of images) {
    if (await isScreenshot(image.path)) return image.path;
  }
  return undefined;
}

export default async function Command() {
  await runCommand("Could not open the latest screenshot", async () => {
    const app = await requireSnapApp();
    if (!app) return;
    const folder = await screenshotFolder();
    const screenshot = await newestScreenshot(folder);
    if (!screenshot) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No screenshot found",
        message: `No screenshots in ${folder}`,
      });
      return;
    }
    await openInSnapApp(app, [screenshot]);
  });
}
