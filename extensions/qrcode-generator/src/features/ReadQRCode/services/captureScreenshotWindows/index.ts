import { showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync, statSync, writeFileSync } from "fs";
import { promisify } from "util";
import { launchSnipTool } from "../launchSnipTool";
import { safeUnlink, tempPath } from "../tempFiles";
import { buildPollScript } from "./pollScript";

const run = promisify(execFile);

async function safeHide(toast: Toast) {
  try {
    await toast.hide();
  } catch {
    /* ignore */
  }
}

export async function captureScreenshotWindows(): Promise<string> {
  const out = tempPath("shot", "png");
  const scriptPath = tempPath("poll", "ps1");
  writeFileSync(scriptPath, buildPollScript(out), "utf8");
  let toast: Toast | undefined;
  try {
    await launchSnipTool();
    toast = await showToast({ style: Toast.Style.Animated, title: "Waiting for snip…" });
    try {
      await run("powershell.exe", ["-Sta", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], {
        timeout: 95_000,
        maxBuffer: 1 << 20,
      });
    } catch {
      /* timeout or non-zero exit handled by file check */
    }
  } finally {
    if (toast) await safeHide(toast);
    safeUnlink(scriptPath);
  }
  if (!existsSync(out) || statSync(out).size === 0) {
    safeUnlink(out);
    throw new Error("Snip timed out or was cancelled");
  }
  return out;
}
