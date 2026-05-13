import { showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { launchSnipTool } from "../launchSnipTool";
import { buildPollScript } from "./pollScript";

const run = promisify(execFile);

function safeUnlink(p: string) {
  try {
    unlinkSync(p);
  } catch {
    /* noop */
  }
}

export async function captureScreenshotWindows(): Promise<string> {
  const out = join(tmpdir(), `qrcode-shot-${Date.now()}.png`);
  const scriptPath = join(tmpdir(), `qrcode-poll-${Date.now()}.ps1`);
  writeFileSync(scriptPath, buildPollScript(out), "utf8");
  await launchSnipTool();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Waiting for snip…" });
  try {
    await run("powershell.exe", ["-Sta", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], {
      timeout: 95_000,
      maxBuffer: 1 << 20,
    });
  } catch {
    /* timeout or non-zero exit, handled by file check */
  }
  await toast.hide();
  safeUnlink(scriptPath);
  if (!existsSync(out)) {
    throw new Error("Snip timed out or was cancelled");
  }
  return out;
}
