import { execFile } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SCREENCAPTURE_BINARIES = ["/usr/sbin/screencapture", "screencapture"];

export class CaptureCancelledError extends Error {
  constructor() {
    super("Screenshot capture was cancelled.");
    this.name = "CaptureCancelledError";
  }
}

export async function captureRegionToFile(outputPath: string): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });

  let lastError: unknown;
  for (const screencapture of SCREENCAPTURE_BINARIES) {
    try {
      await execFileAsync(screencapture, ["-i", outputPath]);
      lastError = undefined;
      break;
    } catch (error: unknown) {
      if (isCaptureCancellation(error)) {
        throw new CaptureCancelledError();
      }

      const code = (error as { code?: string | number }).code;
      if (code === "ENOENT") {
        lastError = error;
        continue;
      }

      throw new Error(`Failed to capture screenshot: ${toErrorMessage(error)}`);
    }
  }

  if (lastError) {
    throw new Error(`Failed to locate screencapture binary: ${toErrorMessage(lastError)}`);
  }

  try {
    await access(outputPath);
  } catch {
    throw new Error("Capture completed without producing a screenshot file.");
  }
}

function isCaptureCancellation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: number | string; stderr?: string; message?: string };
  const code = maybeError.code;
  const stderr = (maybeError.stderr ?? "").toLowerCase();
  const message = (maybeError.message ?? "").toLowerCase();

  if (code === 1 && (stderr.includes("cancel") || message.includes("cancel"))) {
    return true;
  }

  return code === 1 && !stderr && !message.includes("permission");
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
