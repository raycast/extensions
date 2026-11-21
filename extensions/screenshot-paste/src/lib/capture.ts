import { environment } from "@raycast/api";
import { execFile as execFileCallback } from "node:child_process";
import { copyFile, mkdir, readdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { Screen } from "./screens";

const execFile = promisify(execFileCallback);
const SCREENSHOT_MAX_AGE_MS = 10 * 60 * 1_000;
export const CAPTURE_DIRECTORY = path.join(environment.supportPath, "captures");

export const SCREEN_RECORDING_ERROR =
  "Capture failed. Allow Raycast in System Settings > Privacy & Security > Screen Recording.";

function twoDigits(value: number): string {
  return value.toString().padStart(2, "0");
}

export function captureTimestamp(date = new Date()): string {
  return [
    date.getFullYear(),
    twoDigits(date.getMonth() + 1),
    twoDigits(date.getDate()),
    "_",
    twoDigits(date.getHours()),
    "-",
    twoDigits(date.getMinutes()),
    "-",
    twoDigits(date.getSeconds()),
    "-",
    date.getMilliseconds().toString().padStart(3, "0"),
  ].join("");
}

export async function prepareCaptureDirectory(): Promise<void> {
  await mkdir(CAPTURE_DIRECTORY, { recursive: true });

  const cutoff = Date.now() - SCREENSHOT_MAX_AGE_MS;
  const names = await readdir(CAPTURE_DIRECTORY);
  await Promise.all(
    names
      .filter((name) => path.extname(name).toLowerCase() === ".png")
      .map(async (name) => {
        const file = path.join(CAPTURE_DIRECTORY, name);
        const fileStat = await stat(file).catch(() => undefined);
        if (fileStat?.isFile() && fileStat.mtimeMs < cutoff) {
          await unlink(file).catch(() => undefined);
        }
      }),
  );
}

export async function prepareScreenshotDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
}

export async function saveCapture(file: string, directory: string): Promise<string> {
  await prepareScreenshotDirectory(directory);
  const destination = path.join(directory, path.basename(file));

  try {
    await rename(file, destination);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") {
      throw error;
    }

    await copyFile(file, destination);
    await unlink(file);
  }

  return destination;
}

export function screenshotFilePath(directory: string, timestamp: string): string {
  return path.join(directory, `${timestamp}.png`);
}

export async function captureScreen(screen: Screen, file: string): Promise<void> {
  try {
    await execFile("/usr/sbin/screencapture", ["-x", "-D", screen.displayNumber.toString(), file]);
    const fileStat = await stat(file);
    if (!fileStat.isFile() || fileStat.size === 0) {
      throw new Error("Screenshot file is empty");
    }
  } catch (error) {
    await unlink(file).catch(() => undefined);

    const captureError = error as NodeJS.ErrnoException & { stderr?: unknown };
    if (
      captureError.code === "ENOENT" ||
      (typeof captureError.stderr === "string" && captureError.stderr.toLowerCase().includes("could not create image"))
    ) {
      throw new Error(SCREEN_RECORDING_ERROR);
    }

    throw error;
  }
}
