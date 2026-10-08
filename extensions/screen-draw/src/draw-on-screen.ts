import { closeMainWindow, showHUD } from "@raycast/api";
import { execFileSync, spawn } from "child_process";
import { buildOverlay, isOverlayBuilt, OVERLAY_NAME } from "./overlayBinary";

// Returns true if an overlay was running (and is now closed).
function stopRunningOverlay(): boolean {
  try {
    execFileSync("/usr/bin/pkill", ["-x", OVERLAY_NAME]);
    return true;
  } catch {
    return false;
  }
}

export default async function Command() {
  if (stopRunningOverlay()) {
    await showHUD("Drawing off");
    return;
  }

  await closeMainWindow();
  if (!isOverlayBuilt()) {
    await showHUD("Setting up Screen Draw (first run only)...");
  }

  try {
    const binary = await buildOverlay();
    spawn(binary, [], { detached: true, stdio: "ignore" }).unref();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showHUD(`Screen Draw failed: ${message.includes("swiftc") ? "run xcode-select --install" : message}`);
  }
}
