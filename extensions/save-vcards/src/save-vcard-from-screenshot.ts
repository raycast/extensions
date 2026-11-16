import {
  LaunchType,
  closeMainWindow,
  launchCommand,
  open,
  showHUD,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync, rmSync, statSync } from "node:fs";
import { newCapturePath } from "./core/captures";
import { log } from "./core/log";
import { readImage } from "./core/read";
import { requestScreenAccess } from "./native";

const PRIVACY_SCREEN =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";

function capture(file: string): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    // -i: drag a box (Space toggles window mode), -x: no shutter sound. Esc leaves no file.
    execFile(
      "/usr/sbin/screencapture",
      ["-i", "-x", file],
      (err, _stdout, stderr) => {
        resolve({
          code: err ? Number((err as { code?: unknown }).code ?? 1) : 0,
          stderr,
        });
      },
    );
  });
}

export default async function Command() {
  log("screenshot", "start");
  await closeMainWindow();

  // Without Screen Recording, macOS shows its own prompt and screencapture quits without a file.
  // macOS only applies a new grant after Raycast restarts, so say exactly that.
  try {
    if (!(await requestScreenAccess())) {
      log("screenshot", "screen recording not granted");
      await open(PRIVACY_SCREEN);
      await showHUD(
        "Turn on Raycast under Screen Recording, then quit and reopen Raycast",
      );
      return;
    }
  } catch (err) {
    log("screenshot", "screen access check failed, trying anyway", err);
  }

  // Kept in the extension's private folder so the results can show it; deleted after a day.
  const file = newCapturePath();
  const started = Date.now();
  const { code, stderr } = await capture(file);
  const ms = Date.now() - started;
  const exists = existsSync(file);
  log(
    "screenshot",
    `screencapture exit ${code} after ${ms} ms, file ${exists ? statSync(file).size + " bytes" : "missing"}`,
    stderr.trim() || undefined,
  );

  if (!exists) {
    // A real Esc takes a human moment; an instant exit means the capture never started.
    await showHUD(
      ms < 700
        ? `Screenshot failed to start${stderr ? ": " + stderr.trim().slice(0, 60) : ""}`
        : "Capture cancelled",
    );
    return;
  }
  try {
    const text = await readImage(file);
    if (!text.trim()) {
      rmSync(file, { force: true });
      await showHUD("No text found in the capture");
      return;
    }
    await launchCommand({
      name: "save-vcard",
      type: LaunchType.UserInitiated,
      context: { text, image: file, source: "screenshot" },
    });
  } catch (err) {
    rmSync(file, { force: true });
    log("screenshot", "failed", err);
    await showHUD(`Could not read the capture: ${String(err).slice(0, 80)}`);
  }
}
