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
    await execFileAsync("/usr/bin/swiftc", ["-O", sourcePath, "-o", binaryPath]);
  }
  return binaryPath;
}
