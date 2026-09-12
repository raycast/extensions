import { getPreferenceValues } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import { CommandRunner, defaultCommandRunner } from "./commandRunner";
import { expandHome } from "./androidCliResolver";
import { getAndroidCliPath } from "./androidCli";
import { getRunningEmulators } from "./emulatorUtil";
import { adbPath } from "./utils";
import {
  buildCaptureCommand,
  buildSaveDialogCommand,
  connectedDeviceLabel,
  formatBytes,
  parseCaptureOutput,
  parseConnectedDevices,
  pngDimensions,
  screenshotFilename,
} from "./screenshot";

// Orchestration for the Capture Screenshot command: lists connected devices,
// captures through the `android` CLI, and saves/copies the result. All parsing
// and command-building lives in the pure ./screenshot helpers; this module only
// wires them to the injectable command-runner, the filesystem, and preferences.

export interface ConnectedDevice {
  serial: string;
  label: string;
}

export interface ScreenshotCapture {
  /** Absolute path of the auto-saved PNG. */
  path: string;
  filename: string;
  /** "1080 × 2392" when the PNG header could be read. */
  resolution?: string;
  /** Human-readable file size, e.g. "32.6 KB". */
  size: string;
  capturedAt: Date;
}

/**
 * List the currently connected, ready devices. Emulator entries are labeled
 * with their friendly AVD name (reusing the existing running-device detection);
 * physical devices fall back to their hardware model.
 */
export async function getConnectedDevices(
  runner: CommandRunner = defaultCommandRunner
): Promise<ConnectedDevice[]> {
  const stdout = await runner.exec(`${adbPath} devices -l`);
  const parsed = parseConnectedDevices(stdout);
  // A flaky/unavailable emulator console must not sink the whole list — when
  // AVD-name lookup fails, physical devices (and any others) still get
  // model/serial labels via connectedDeviceLabel's fallback.
  let emulators: Awaited<ReturnType<typeof getRunningEmulators>> = [];
  try {
    emulators = await getRunningEmulators();
  } catch (error) {
    console.error(
      "[android] device labeling: getRunningEmulators failed; falling back to model/serial labels",
      error
    );
  }
  return parsed.map((device) => ({
    serial: device.serial,
    label: connectedDeviceLabel(device, emulators),
  }));
}

/** The configured screenshot folder, tilde-expanded; defaults to ~/Downloads. */
export function screenshotFolder(): string {
  const preference =
    (getPreferenceValues().screenshotFolder as string | undefined)?.trim() ??
    "";
  const folder = preference.length > 0 ? preference : "~/Downloads";
  return expandHome(folder, os.homedir());
}

/**
 * Capture the given device's screen via `android screen capture`, auto-save it
 * to the screenshot folder with a timestamped name, and read back its size and
 * resolution for the preview.
 */
export async function captureScreenshot(
  device: ConnectedDevice,
  runner: CommandRunner = defaultCommandRunner
): Promise<ScreenshotCapture> {
  const cli = await getAndroidCliPath(runner);
  if (!cli) {
    throw new Error("Android CLI is not installed");
  }

  const capturedAt = new Date();
  const folder = screenshotFolder();
  fs.mkdirSync(folder, { recursive: true });
  const filename = screenshotFilename(capturedAt);
  const outputPath = path.join(folder, filename);

  const stdout = await runner.exec(
    buildCaptureCommand(cli, device.serial, outputPath)
  );
  const written = parseCaptureOutput(stdout) ?? outputPath;
  if (!fs.existsSync(written)) {
    throw new Error(
      `Capture reported success but no file was found at ${written}`
    );
  }

  const buffer = fs.readFileSync(written);
  const dimensions = pngDimensions(buffer);
  return {
    path: written,
    filename,
    resolution: dimensions
      ? `${dimensions.width} × ${dimensions.height}`
      : undefined,
    size: formatBytes(buffer.length),
    capturedAt,
  };
}

/**
 * Show a native "save as" dialog and copy the capture to the chosen location.
 * Returns the destination path, or undefined when the user cancels. A genuine
 * copy failure (permissions, disk full) is thrown so the caller can surface it
 * — only the dialog-cancel case is swallowed.
 */
export async function saveScreenshotAs(
  capture: ScreenshotCapture,
  runner: CommandRunner = defaultCommandRunner
): Promise<string | undefined> {
  let destination: string | undefined;
  try {
    const out = await runner.exec(buildSaveDialogCommand(capture.filename));
    destination = out.split("\n")[0]?.trim();
  } catch {
    // osascript exits non-zero when the user cancels the dialog.
    return undefined;
  }

  if (!destination) {
    return undefined;
  }
  fs.copyFileSync(capture.path, destination);
  return destination;
}
