/**
 * Wraps the `audio-devices` CLI from the `macos-audio-devices` npm package
 * (https://github.com/karaggeorge/macos-audio-devices, MIT licensed, copyright George
 * Karagkiaouris) to list and switch macOS audio devices. The binary is vendored at
 * assets/audio-devices (copied verbatim from node_modules/macos-audio-devices/audio-
 * devices, unmodified) and spawned directly via execSafe.
 *
 * We do NOT use the npm package's JS wrapper (`import("macos-audio-devices")`): that
 * wrapper resolves the binary path relative to its own module directory
 * (node_modules/macos-audio-devices), which breaks once `ray build` bundles the
 * extension into a single file — the relative path points nowhere, every call
 * rejects, and the Audio Devices view silently shows "No Results". Vendoring the
 * binary into assets/ and resolving it via `environment.assetsPath` at runtime
 * survives bundling.
 *
 * The `macos-audio-devices` dependency stays in package.json purely as the source of
 * truth for this binary (provenance/license/updates) and as a dev/test fallback path
 * — its JS wrapper is never imported here.
 */
import { chmodSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { AudioDevice } from "../core/types";
import { execSafe } from "../lib/exec";

/** transportType values (lowercased) that count as wireless. */
const WIRELESS_TRANSPORTS = new Set([
  "bluetooth",
  "bluetooth-le",
  "bluetoothle",
  "airplay",
]);

interface RawDevice {
  id: number;
  name: string;
  isInput: boolean;
  isOutput: boolean;
  transportType: string;
  volume?: number;
}

let binPath: string | undefined;

/** Resolve the `audio-devices` CLI binary. Lazy so unit tests never touch the Raycast
 * runtime (mirrors the resolveDir() precedent in src/core/artworkCache.ts). */
function resolveBin(): string {
  if (binPath) return binPath;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { environment } = require("@raycast/api") as {
      environment?: { assetsPath: string };
    };
    const bundled = environment?.assetsPath
      ? join(environment.assetsPath, "audio-devices")
      : undefined;
    if (bundled && existsSync(bundled)) {
      try {
        chmodSync(bundled, 0o755);
      } catch {
        // best-effort; Raycast may already preserve the exec bit on install
      }
      binPath = bundled;
      return binPath;
    }
  } catch {
    // no Raycast runtime available (unit tests, dev scripts) — fall through
  }

  const devFallback = join(
    __dirname,
    "..",
    "..",
    "node_modules",
    "macos-audio-devices",
    "audio-devices",
  );
  if (existsSync(devFallback)) {
    binPath = devFallback;
    return binPath;
  }

  binPath = "audio-devices";
  return binPath;
}

function isWirelessTransport(transportType: string): boolean {
  return WIRELESS_TRANSPORTS.has(transportType.toLowerCase());
}

function toAudioDevice(
  device: RawDevice,
  kind: "input" | "output",
  defaultId: number | null,
): AudioDevice {
  return {
    id: String(device.id),
    name: device.name,
    kind,
    transportType: device.transportType,
    isWireless: isWirelessTransport(device.transportType),
    isDefault: defaultId !== null && device.id === defaultId,
    volume: device.volume,
  };
}

async function runJson<T>(args: string[]): Promise<T | null> {
  const out = await execSafe(resolveBin(), args);
  if (out === null) return null;
  try {
    return JSON.parse(out) as T;
  } catch {
    return null;
  }
}

async function safeDefaultId(args: string[]): Promise<number | null> {
  const device = await runJson<{ id: number }>(args);
  return device?.id ?? null;
}

/** All audio devices, split into input/output entries. Empty array if the CLI fails. */
export async function getDevices(): Promise<AudioDevice[]> {
  try {
    const [rawDevices, defaultOutputId, defaultInputId] = await Promise.all([
      runJson<RawDevice[]>(["list", "--json"]),
      safeDefaultId(["output", "get", "--json"]),
      safeDefaultId(["input", "get", "--json"]),
    ]);
    if (rawDevices === null) return [];

    const devices: AudioDevice[] = [];
    for (const device of rawDevices) {
      if (device.isOutput)
        devices.push(toAudioDevice(device, "output", defaultOutputId));
      if (device.isInput)
        devices.push(toAudioDevice(device, "input", defaultInputId));
    }
    return devices;
  } catch {
    return [];
  }
}

/** Switch the default output device. Returns false on failure. */
export async function setDefaultOutput(deviceId: string): Promise<boolean> {
  try {
    const out = await execSafe(resolveBin(), ["output", "set", deviceId]);
    return out !== null;
  } catch {
    return false;
  }
}
