import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";
import { existsSync, statSync } from "fs";

const run = promisify(execFile);

export async function captureScreenshot(): Promise<string> {
  const target = join(tmpdir(), `qrcode-shot-${Date.now()}.png`);
  await run("screencapture", ["-i", target]);
  if (!existsSync(target) || statSync(target).size === 0) {
    throw new Error("Screenshot was cancelled");
  }
  return target;
}
