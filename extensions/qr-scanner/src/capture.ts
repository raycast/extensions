import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { copyFile, mkdir, access } from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

const execFileAsync = promisify(execFile);

/**
 * Wait for a given number of milliseconds.
 */
export function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Capture the entire display to a PNG file.
 * Supports macOS (screencapture) and Windows (PowerShell + .NET).
 */
export async function captureDisplay(outputPath: string) {
  switch (process.platform) {
    case "darwin":
      await execFileAsync("screencapture", ["-x", outputPath]);
      return;
    case "win32":
      await captureWindowsDisplay(outputPath);
      return;
    default:
      throw new Error("This command currently supports macOS and Windows.");
  }
}

async function captureWindowsDisplay(outputPath: string) {
  try {
    const tmpBat = path.join(
      os.tmpdir(),
      "screenCapture",
      "screenCapture_1.3.2.bat",
    );
    const tmpManifest = path.join(os.tmpdir(), "screenCapture", "app.manifest");

    // Copy the bat and manifest from Raycast assets to the temp folder
    const exists = async (p: string) =>
      access(p).then(
        () => true,
        () => false,
      );
    if (!(await exists(tmpBat)) || !(await exists(tmpManifest))) {
      await mkdir(path.join(os.tmpdir(), "screenCapture"), { recursive: true });

      const includeBat = path.join(
        environment.assetsPath,
        "screenCapture_1.3.2.bat",
      );
      const includeManifest = path.join(environment.assetsPath, "app.manifest");

      await copyFile(includeBat, tmpBat);
      await copyFile(includeManifest, tmpManifest);
    }

    const batArgs = [outputPath];
    const args = ["/c", tmpBat, ...batArgs];

    await execFileAsync("cmd.exe", args, {
      cwd: path.join(os.tmpdir(), "screenCapture"),
      windowsHide: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Screen capture failed. Your work laptop's antivirus or Group Policy might be blocking screen recording or unauthorized scripts.\n\nDetails: ${message}`,
    );
  }
}
