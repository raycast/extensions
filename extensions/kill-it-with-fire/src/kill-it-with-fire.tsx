/**
 * Kill It With Fire — Raycast Command
 *
 * A "no-view" command that launches the native macOS overlay binary
 * (assets/overlay). The overlay creates a transparent, click-through,
 * always-on-top window with the flame animation, then auto-closes.
 */

import { closeMainWindow, environment, showHUD } from "@raycast/api";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

/** Duration the overlay stays visible (seconds). */
const DURATION_SEC = "4.5";

export default async function Command() {
  const overlayBin = path.join(environment.assetsPath, "overlay");
  const flamePath = path.join(environment.assetsPath, "flame.html");

  // Ensure the binary has execute permission (Raycast's asset pipeline may strip it).
  try {
    fs.chmodSync(overlayBin, 0o755);
  } catch (e) {
    console.error("chmod failed:", e);
  }

  // Verify both files exist before launching.
  if (!fs.existsSync(overlayBin)) {
    await showHUD("❌ overlay binary not found");
    return;
  }
  if (!fs.existsSync(flamePath)) {
    await showHUD("❌ flame.html not found");
    return;
  }

  // Spawn the overlay as a detached process so Raycast doesn't wait on it.
  const child = spawn(overlayBin, [flamePath, DURATION_SEC], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  await closeMainWindow();
}
