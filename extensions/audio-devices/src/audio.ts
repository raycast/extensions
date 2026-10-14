import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { environment } from "@raycast/api";
import { AudioDevice, DeviceRole, Flow } from "./types";

const execFileAsync = promisify(execFile);

type RawDevice = {
  id: string;
  name: string;
  volume: number | null;
  muted: boolean | null;
  default: boolean;
  communications: boolean;
};

function decode(stdout: Buffer): string {
  if (stdout.length >= 2 && stdout[0] === 0xff && stdout[1] === 0xfe) {
    return stdout.toString("utf16le");
  }
  if (stdout.length >= 4 && stdout[1] === 0 && stdout[3] === 0) {
    return stdout.toString("utf16le");
  }
  return stdout.toString("utf8");
}

function parseJson(stdout: Buffer): unknown {
  const text = decode(stdout)
    .replace(/^\uFEFF/, "")
    .trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error(text || "Audio helper returned nothing");
  }
  return JSON.parse(text.slice(start, end + 1)) as unknown;
}

export function failureMessage(error: unknown): string {
  const err = error as { stderr?: Buffer | string; message?: string };
  const stderr = Buffer.isBuffer(err.stderr) ? decode(err.stderr) : (err.stderr ?? "");
  const raw = `${stderr}\n${err.message ?? ""}`.replace(/^\uFEFF/, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const payload = JSON.parse(raw.slice(start, end + 1)) as { error?: string };
      if (payload.error) return payload.error;
    } catch {
      // fall through to the plain text
    }
  }
  const line = raw
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .pop();
  return line || "Audio helper failed";
}

function mapDevice(device: RawDevice): AudioDevice {
  return {
    id: device.id,
    name: device.name,
    volume: device.volume,
    muted: device.muted,
    isDefault: device.default,
    isCommunications: device.communications,
  };
}

async function run(args: string[]): Promise<unknown> {
  const script = path.join(environment.assetsPath, "windows-audio.ps1");
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        script,
        ...args,
        "-CacheDir",
        environment.supportPath,
      ],
      { windowsHide: true, encoding: "buffer", timeout: 45000, maxBuffer: 1024 * 1024 },
    );
    const payload = parseJson(stdout as unknown as Buffer);
    if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
      throw new Error(payload.error);
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && !("stderr" in error)) throw error;
    throw new Error(failureMessage(error));
  }
}

export async function listDevices(flow: Flow): Promise<AudioDevice[]> {
  const payload = (await run(["-Action", "list", "-Flow", flow])) as { devices?: RawDevice[] };
  return (payload.devices ?? []).map(mapDevice);
}

export async function setDevice(flow: Flow, id: string, role: DeviceRole): Promise<AudioDevice> {
  const payload = (await run(["-Action", "set", "-Flow", flow, "-Id", id, "-Role", role])) as {
    device: RawDevice;
  };
  return mapDevice(payload.device);
}

export async function setVolume(flow: Flow, id: string, level: number): Promise<AudioDevice> {
  const payload = (await run(["-Action", "volume", "-Flow", flow, "-Id", id, "-Level", String(Math.round(level))])) as {
    device: RawDevice;
  };
  return mapDevice(payload.device);
}

export async function toggleMute(flow: Flow, id: string): Promise<AudioDevice> {
  const payload = (await run(["-Action", "mute", "-Flow", flow, "-Id", id, "-Muted", "toggle"])) as {
    device: RawDevice;
  };
  return mapDevice(payload.device);
}

export async function cycleDevice(flow: Flow): Promise<string> {
  const devices = await listDevices(flow);
  const label = flow === "output" ? "Output" : "Input";
  if (devices.length === 0) throw new Error(`No active ${flow} devices`);
  if (devices.length === 1) return `Only one ${flow}: ${devices[0].name}`;
  const index = devices.findIndex((device) => device.isDefault);
  const next = devices[(index + 1) % devices.length];
  await setDevice(flow, next.id, "playback");
  return `${label}: ${next.name}`;
}
