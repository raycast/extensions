import { environment, open, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile, spawn } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function ensureNativeViewer(): Promise<string | null> {
  const swiftSrc = path.join(environment.assetsPath, "viewer.swift");
  if (!fs.existsSync(swiftSrc) || !fs.existsSync("/usr/bin/swiftc")) {
    return null;
  }

  fs.mkdirSync(environment.supportPath, { recursive: true });
  const viewerBin = path.join(environment.supportPath, "HotkeysViewer");
  const hashFile = path.join(environment.supportPath, "HotkeysViewer.sha256");

  const srcHash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(swiftSrc))
    .digest("hex");
  if (fs.existsSync(viewerBin) && fs.existsSync(hashFile)) {
    const savedHash = fs.readFileSync(hashFile, "utf8").trim();
    if (savedHash === srcHash) {
      return viewerBin;
    }
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Preparing native viewer…",
    message: "One-time setup (takes a few seconds)",
  });

  try {
    await execFileAsync("/usr/bin/swiftc", [
      swiftSrc,
      "-o",
      viewerBin,
      "-framework",
      "Cocoa",
      "-framework",
      "WebKit",
    ]);
    fs.chmodSync(viewerBin, 0o755);
    fs.writeFileSync(hashFile, srcHash);
    toast.hide();
    return viewerBin;
  } catch {
    toast.hide();
    return null;
  }
}

export default async function Command() {
  try {
    const htmlPath = path.join(environment.assetsPath, "raycast-hotkeys.html");
    const viewerBin = await ensureNativeViewer();

    if (viewerBin) {
      const child = spawn(viewerBin, [htmlPath], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      await showHUD("Opened Raycast Hotkeys Map");
      return;
    }

    await open(htmlPath);
    await showHUD("Opened Raycast Hotkeys Map in browser");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to open Hotkeys Map" });
  }
}
