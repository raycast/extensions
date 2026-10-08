import { environment } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync, statSync } from "fs";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const OVERLAY_NAME = "ScreenDraw";

const sourcePath = join(environment.assetsPath, `${OVERLAY_NAME}.swift`);
const binaryPath = join(environment.supportPath, OVERLAY_NAME);

export function isOverlayBuilt(): boolean {
  return existsSync(binaryPath) && statSync(binaryPath).mtimeMs >= statSync(sourcePath).mtimeMs;
}

// Compiles the bundled Swift overlay once (and again whenever the source changes).
export async function buildOverlay(): Promise<string> {
  if (!isOverlayBuilt()) {
    try {
      await execFileAsync("/usr/bin/swiftc", ["-O", sourcePath, "-o", binaryPath]);
    } catch (error) {
      throw new Error(describeCompileError(error));
    }
  }
  return binaryPath;
}

function describeCompileError(error: unknown): string {
  const stderr = (error as { stderr?: string }).stderr ?? "";
  // /usr/bin/swiftc is a shim that fails through xcrun when the developer tools are missing.
  if (stderr.includes("xcrun: error")) {
    return "Xcode Command Line Tools are missing - run xcode-select --install";
  }
  const firstError = stderr.split("\n").find((line) => line.includes("error:"));
  return firstError?.trim() || (error instanceof Error ? error.message : String(error));
}
