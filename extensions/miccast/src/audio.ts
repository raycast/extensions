// src/audio.ts
//
// Thin wrapper around the bundled `audio-devices` CLI binary (CoreAudio).
//
// The binary is vendored into the extension's assets (assets/audio-devices) so
// it ships inside the Raycast bundle; Raycast exposes that directory at runtime
// as environment.assetsPath. We invoke it directly rather than via the
// `macos-audio-devices` npm wrapper, because that wrapper resolves the binary
// relative to its own __dirname — which Raycast's bundler collapses into the
// single bundled file, so the binary is no longer found there (ENOENT).
import { execFile } from "node:child_process";
import { chmodSync } from "node:fs";
import { join } from "node:path";
import { environment } from "@raycast/api";

export type DeviceType = "input" | "output";

export interface Device {
  id: number;
  name: string;
  isCurrent: boolean;
}

interface RawDevice {
  id: number;
  name: string;
}

let madeExecutable = false;

function binaryPath(): string {
  const path = join(environment.assetsPath, "audio-devices");
  if (!madeExecutable) {
    try {
      // The executable bit can be lost when the asset is copied into the
      // bundle; restore it best-effort before the first invocation.
      chmodSync(path, 0o755);
    } catch {
      // Already executable, or not permitted — the spawn below will surface
      // any real problem.
    }
    madeExecutable = true;
  }
  return path;
}

function run(args: readonly string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(binaryPath(), args, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      if (stderr && stderr.trim().length > 0) {
        reject(new Error(stderr.trim()));
        return;
      }
      resolve(stdout);
    });
  });
}

const cli = {
  input: {
    list: ["list", "--input", "--json"],
    current: ["input", "get", "--json"],
    set: (id: number) => ["input", "set", String(id)],
  },
  output: {
    list: ["list", "--output", "--json"],
    current: ["output", "get", "--json"],
    set: (id: number) => ["output", "set", String(id)],
  },
} as const;

export async function getDevices(type: DeviceType): Promise<Device[]> {
  const [listOut, currentOut] = await Promise.all([
    run(cli[type].list),
    run(cli[type].current),
  ]);
  const devices = JSON.parse(listOut) as RawDevice[];
  const current = JSON.parse(currentOut) as RawDevice;
  return devices.map((d) => ({
    id: d.id,
    name: d.name,
    isCurrent: d.id === current.id,
  }));
}

export async function getCurrent(type: DeviceType): Promise<Device> {
  const current = JSON.parse(await run(cli[type].current)) as RawDevice;
  return { id: current.id, name: current.name, isCurrent: true };
}

export async function setDevice(type: DeviceType, id: number): Promise<void> {
  await run(cli[type].set(id));
}
