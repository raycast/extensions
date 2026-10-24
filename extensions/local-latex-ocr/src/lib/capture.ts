import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function captureRegion(supportPath: string): Promise<string | undefined> {
  const directory = path.join(supportPath, "captures");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const outputPath = path.join(directory, `${randomUUID()}.png`);
  try {
    await execFileAsync("/usr/sbin/screencapture", ["-i", "-x", outputPath], {
      timeout: 5 * 60_000,
      maxBuffer: 64 * 1024,
    });
  } catch (error) {
    if (!(await fileHasContent(outputPath))) {
      const stderr = String((error as { stderr?: string }).stderr ?? "");
      if (!stderr.trim() || /cancel/i.test(stderr)) return undefined;
      throw new ScreenCapturePermissionError(stderr.trim());
    }
  }
  if (!(await fileHasContent(outputPath))) {
    await rm(outputPath, { force: true });
    return undefined;
  }
  return outputPath;
}

async function fileHasContent(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).size > 0;
  } catch {
    return false;
  }
}

export class ScreenCapturePermissionError extends Error {
  constructor(detail?: string) {
    super(detail || "Raycast could not capture the screen. Check Screen Recording permission.");
  }
}
