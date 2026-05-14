import { execFile } from "child_process";
import { existsSync, statSync } from "fs";
import { promisify } from "util";
import { tempPath } from "../tempFiles";

const run = promisify(execFile);

export async function captureScreenshot(): Promise<string> {
  const target = tempPath("shot", "png");
  await run("screencapture", ["-i", target]);
  if (!existsSync(target) || statSync(target).size === 0) {
    throw new Error("Screenshot was cancelled");
  }
  return target;
}
