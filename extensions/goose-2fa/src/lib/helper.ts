import { closeMainWindow, environment, PopToRootType } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const HELPER_NAME = "goose-2fa-helper";

export function helperPath(): string {
  return path.join(environment.assetsPath, HELPER_NAME);
}

/** 用 Vision 识别图片里的二维码/条码，逐行返回 payload。 */
export async function detectBarcodes(imagePath: string): Promise<string[]> {
  const { stdout } = await execFileAsync(helperPath(), ["qr", imagePath], { maxBuffer: 1024 * 1024 });
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** 交互式截屏到临时文件；用户按 ESC 取消时返回 null。 */
export async function captureScreenToTempFile(): Promise<string | null> {
  const target = path.join(tmpdir(), `goose-2fa-scan-${process.pid}-${Date.now()}.png`);
  try {
    // Keep the scanner and its results available when Raycast is reopened.
    await closeMainWindow({ popToRootType: PopToRootType.Suspended });
    await execFileAsync("/usr/sbin/screencapture", ["-x", "-i", target]);
  } catch {
    return null;
  }
  return existsSync(target) ? target : null;
}
