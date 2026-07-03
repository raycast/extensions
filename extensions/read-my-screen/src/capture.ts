import { execFile } from "node:child_process";
import { existsSync, statSync, unlinkSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SCREENCAPTURE = "/usr/sbin/screencapture";

export type CaptureMode = "interactive" | "fullscreen" | "window" | "clipboard";

export class CaptureError extends Error {
  constructor(
    public readonly kind: "cancelled" | "permission" | "failed",
    message: string,
  ) {
    super(message);
    this.name = "CaptureError";
  }
}

function isPermissionHint(stderr: string, stdout: string): boolean {
  const combined = `${stderr}\n${stdout}`.toLowerCase();
  return (
    combined.includes("could not create") ||
    combined.includes("permission") ||
    combined.includes("not authorized") ||
    combined.includes("screen recording")
  );
}

/**
 * Capture screenshot to a PNG path using macOS screencapture.
 * - interactive: user selects region (crosshair)
 * - fullscreen: primary display(s) per screencapture defaults
 * - window: user picks a window
 */
export async function captureToFile(mode: CaptureMode, outPath: string): Promise<void> {
  const args: string[] = ["-x"];
  if (mode === "interactive") {
    args.push("-i");
  } else if (mode === "window") {
    args.push("-w");
  }
  args.push(outPath);

  try {
    await execFileAsync(SCREENCAPTURE, args, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180_000,
    });
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string; stdout?: string; code?: string | number };
    const stderr = typeof e.stderr === "string" ? e.stderr : "";
    const stdout = typeof e.stdout === "string" ? e.stdout : "";

    if (e.code != null && `${e.code}` === "1") {
      throw new CaptureError("cancelled", "Screenshot was cancelled.");
    }
    if (isPermissionHint(stderr, stdout)) {
      throw new CaptureError(
        "permission",
        "Screen capture was blocked. Enable Screen Recording for Raycast in System Settings → Privacy & Security.",
      );
    }
    throw new CaptureError("failed", `screencapture failed: ${stderr || stdout || e.message || String(err)}`);
  }

  if (!existsSync(outPath)) {
    throw new CaptureError(
      "permission",
      "No screenshot was saved. Grant Screen Recording permission to Raycast, then try again.",
    );
  }
  const st = statSync(outPath);
  if (st.size === 0) {
    try {
      unlinkSync(outPath);
    } catch {
      /* ignore */
    }
    throw new CaptureError("failed", "Screenshot file is empty.");
  }
}

export function safeUnlink(path: string): void {
  try {
    if (existsSync(path)) unlinkSync(path);
  } catch {
    /* ignore */
  }
}
