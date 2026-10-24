// Pure helpers for the Capture Screenshot command. Kept free of any Raycast or
// Node-fs imports so they can be unit-tested directly against captured CLI
// stdout and real PNG bytes. The only side-effecting work (running the CLI,
// touching the filesystem) lives in the orchestration module.
import { quoteArg } from "./shell";

/** A device that is connected and in a usable ("device") state. */
export interface ParsedDevice {
  serial: string;
  model?: string;
}

const DEVICE_HEADER = "List of devices attached";
const CAPTURE_WRITTEN = /Screenshot written to (.+\S)\s*$/m;

/**
 * Parse `adb devices -l` stdout into the list of ready devices.
 *
 * Each device line looks like:
 *   00145153G001187        device usb:0-1.2 product:Foo model:A059 device:Bar transport_id:1
 *   emulator-5554          device product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 ...
 *
 * Only devices whose state is exactly `device` are returned (offline and
 * unauthorized devices can't be screenshotted). The `model:` key, when present,
 * is surfaced so callers can label physical devices that aren't emulators.
 */
export function parseConnectedDevices(stdout: string): ParsedDevice[] {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== DEVICE_HEADER)
    .map((line) => {
      const tokens = line.split(/\s+/);
      const serial = tokens[0];
      const state = tokens[1];
      if (state !== "device") {
        return undefined;
      }
      const modelToken = tokens.find((t) => t.startsWith("model:"));
      const model = modelToken ? modelToken.slice("model:".length) : undefined;
      const parsed: ParsedDevice = { serial, model };
      return parsed;
    })
    .filter((device): device is ParsedDevice => device !== undefined);
}

/**
 * Pick a human-friendly label for a device: the running emulator's AVD name
 * when the serial matches a known emulator, otherwise the hardware model, and
 * finally the raw serial as a last resort.
 */
export function connectedDeviceLabel(
  device: ParsedDevice,
  emulators: { id: string; name: string }[]
): string {
  const emulator = emulators.find((e) => e.id === device.serial);
  return emulator?.name ?? device.model ?? device.serial;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** A filesystem-safe, timestamped screenshot filename for the given moment. */
export function screenshotFilename(date: Date): string {
  const stamp =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(
      date.getSeconds()
    )}`;
  return `Screenshot_${stamp}.png`;
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/**
 * Read the pixel dimensions straight from a PNG's IHDR header (the width and
 * height are big-endian uint32s at byte offsets 16 and 20). Returns undefined
 * for anything that isn't a PNG.
 */
export function pngDimensions(
  buffer: Buffer
): { width: number; height: number } | undefined {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return undefined;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

/** Extract the written file path from `android screen capture` stdout. */
export function parseCaptureOutput(stdout: string): string | undefined {
  return stdout.match(CAPTURE_WRITTEN)?.[1].trim();
}

/** Format a byte count as a compact, human-readable size. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Build the capture command. `screen capture` has no device flag, so the chosen
 * device is targeted through the ANDROID_SERIAL environment variable prefixed
 * onto the command — the same env-injection style used for the emulator path.
 */
export function buildCaptureCommand(
  cliPath: string,
  serial: string,
  outputPath: string
): string {
  return `ANDROID_SERIAL=${quoteArg(serial)} ${quoteArg(
    cliPath
  )} screen capture -o ${quoteArg(outputPath)}`;
}

/**
 * Build the osascript command that shows a native "save as" dialog and prints
 * the chosen POSIX path. Errors (non-zero exit) when the user cancels.
 */
export function buildSaveDialogCommand(defaultName: string): string {
  return `osascript -e 'POSIX path of (choose file name with prompt "Save screenshot as" default name "${defaultName}")'`;
}

/** Convert an absolute path to a percent-encoded file:// URL. */
export function toFileUrl(path: string): string {
  return "file://" + path.split("/").map(encodeURIComponent).join("/");
}

/** Markdown that embeds the captured screenshot in a Detail view. */
export function screenshotMarkdown(path: string): string {
  return `![Screenshot](${toFileUrl(path)})`;
}
