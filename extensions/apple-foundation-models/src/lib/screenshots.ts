import { execFile } from "node:child_process";
import { readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { isImageFile, isScreenshotName } from "./images";

const execFileAsync = promisify(execFile);

/** The folder macOS saves screenshots to (Desktop unless changed in the Screenshot app). */
async function screenshotFolder(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/defaults", ["read", "com.apple.screencapture", "location"]);
    const folder = stdout.trim().replace(/^~(?=\/|$)/, homedir());
    // Spotlight returns real paths, so a trailing slash, a symlink or other letter case must not matter.
    if (folder) return await realpath(folder).catch(() => resolve(folder));
  } catch {
    // The setting does not exist until it is changed once.
  }
  return join(homedir(), "Desktop");
}

/** Screenshots that Spotlight knows about. This also finds them when macOS uses another language for the name. */
async function spotlightScreenshots(folder: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/mdfind", ["-onlyin", folder, "kMDItemIsScreenCapture == 1"], {
      timeout: 5000,
    });
    return stdout.split("\n").filter((path) => path && dirname(path) === folder && isImageFile(path));
  } catch {
    return [];
  }
}

export async function latestScreenshot(): Promise<string | undefined> {
  const folder = await screenshotFolder();
  const byName = (await readdir(folder).catch(() => [] as string[]))
    .filter(isScreenshotName)
    .map((name) => join(folder, name));
  const paths = [...new Set([...(await spotlightScreenshots(folder)), ...byName])];
  const files = await Promise.all(
    paths.map(async (path) => ({ path, time: (await stat(path).catch(() => undefined))?.mtimeMs ?? -1 })),
  );
  return files.filter((file) => file.time >= 0).sort((a, b) => b.time - a.time)[0]?.path;
}
