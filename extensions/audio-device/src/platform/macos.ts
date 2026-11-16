import path from "path";
import { execa } from "execa";
import { environment } from "@raycast/api";
import fs from "fs";
import { TransportType, type PlatformAudioAPI, type AudioDevice, type IOType } from "./index";

const binaryAsset = path.join(environment.assetsPath, "audio-devices");
const binary = path.join(environment.supportPath, "audio-devices");

const soundControlAsset = path.join(environment.assetsPath, "sound-control");
const soundControlBinary = path.join(environment.supportPath, "sound-control");

const btAudioAsset = path.join(environment.assetsPath, "bt-audio");
const btAudioBinary = path.join(environment.supportPath, "bt-audio");

function needsCopy(source: string, target: string): boolean {
  if (!fs.existsSync(target)) return true;
  try {
    return fs.statSync(source).size !== fs.statSync(target).size;
  } catch {
    return true;
  }
}

async function ensureBinary() {
  if (needsCopy(binaryAsset, binary)) {
    fs.copyFileSync(binaryAsset, binary);
    await execa("chmod", ["+x", binary]);
  }
}

async function ensureSoundControl() {
  if (needsCopy(soundControlAsset, soundControlBinary)) {
    fs.copyFileSync(soundControlAsset, soundControlBinary);
    await execa("chmod", ["+x", soundControlBinary]);
  }
}

function throwIfStderr({ stderr }: { stderr: string }) {
  if (stderr) {
    throw new Error(stderr);
  }
}

function parseStdout({ stdout, stderr }: { stderr: string; stdout: string }) {
  throwIfStderr({ stderr });
  return JSON.parse(stdout);
}

// macOS only registers a Bluetooth audio device with CoreAudio once an audio
// profile is connected, so paired BT headphones are invisible to audio-devices
// until selected. bt-audio lists them from IOBluetooth; such devices get a
// synthetic "bt:<address>" id which is resolved to a HAL id on selection.

const BT_ID_PREFIX = "bt:";

type BtDevice = { name: string; address: string; connected: boolean; hasMic: boolean };

async function ensureBtAudio() {
  if (needsCopy(btAudioAsset, btAudioBinary)) {
    fs.copyFileSync(btAudioAsset, btAudioBinary);
    await execa("chmod", ["+x", btAudioBinary]);
  }
}

async function getBtAudioDevices(): Promise<BtDevice[]> {
  try {
    await ensureBtAudio();
    return JSON.parse((await execa(btAudioBinary, ["list"], { timeout: 5_000 })).stdout);
  } catch {
    return [];
  }
}

function normalizeAddress(s: string): string {
  return s.replace(/[^0-9a-f]/gi, "").toLowerCase();
}

function isBtDevicePresent(hal: AudioDevice, bt: BtDevice): boolean {
  const uid = normalizeAddress(hal.uid);
  const addr = normalizeAddress(bt.address);
  return (uid.length > 0 && uid.includes(addr)) || hal.name === bt.name;
}

async function mergeBtAudioDevices(devices: AudioDevice[]): Promise<AudioDevice[]> {
  const bt = await getBtAudioDevices();
  const phantoms = bt
    .filter((b) => b.connected && !devices.some((d) => isBtDevicePresent(d, b)))
    .map((b): AudioDevice => ({
      name: b.name,
      id: `${BT_ID_PREFIX}${b.address}`,
      uid: `${BT_ID_PREFIX}${b.address}`,
      isInput: b.hasMic,
      isOutput: true,
      transportType: TransportType.Bluetooth,
    }));
  return [...devices, ...phantoms];
}

async function resolveDeviceId(deviceId: string, type: IOType): Promise<string> {
  if (!deviceId.startsWith(BT_ID_PREFIX)) return deviceId;
  await ensureBinary();
  const addr = normalizeAddress(deviceId.slice(BT_ID_PREFIX.length));
  const all = parseStdout(await execa(binary, ["list", "--json"])) as AudioDevice[];
  // Bluetooth devices register as separate ":input" and ":output" HAL objects.
  const existing = all.find(
    (d) => normalizeAddress(d.uid).includes(addr) && (type === "input" ? d.isInput : d.isOutput),
  );
  if (existing) return existing.id;

  await ensureBtAudio();
  const device = JSON.parse(
    (
      await execa(btAudioBinary, ["connect", deviceId.slice(BT_ID_PREFIX.length), `--${type}`], {
        timeout: 45_000,
      })
    ).stdout,
  ) as AudioDevice;
  return String(device.id);
}

export const macosAudioAPI: PlatformAudioAPI = {
  async getAllDevices(): Promise<AudioDevice[]> {
    await ensureBinary();
    return mergeBtAudioDevices(parseStdout(await execa(binary, ["list", "--json"])));
  },

  async getInputDevices(): Promise<AudioDevice[]> {
    await ensureBinary();
    const devices = parseStdout(await execa(binary, ["list", "--input", "--json"])) as AudioDevice[];
    return (await mergeBtAudioDevices(devices)).filter((d) => d.isInput);
  },

  async getOutputDevices(): Promise<AudioDevice[]> {
    await ensureBinary();
    const devices = parseStdout(await execa(binary, ["list", "--output", "--json"])) as AudioDevice[];
    return (await mergeBtAudioDevices(devices)).filter((d) => d.isOutput);
  },

  async getDefaultOutputDevice(): Promise<AudioDevice> {
    await ensureBinary();
    return parseStdout(await execa(binary, ["output", "get", "--json"]));
  },

  async getDefaultInputDevice(): Promise<AudioDevice> {
    await ensureBinary();
    return parseStdout(await execa(binary, ["input", "get", "--json"]));
  },

  async getDefaultSystemDevice(): Promise<AudioDevice> {
    await ensureBinary();
    return parseStdout(await execa(binary, ["system", "get", "--json"]));
  },

  async setDefaultOutputDevice(deviceId: string) {
    const id = await resolveDeviceId(deviceId, "output");
    await ensureBinary();
    return throwIfStderr(await execa(binary, ["output", "set", id]));
  },

  async setDefaultInputDevice(deviceId: string) {
    const id = await resolveDeviceId(deviceId, "input");
    await ensureBinary();
    return throwIfStderr(await execa(binary, ["input", "set", id]));
  },

  async setDefaultSystemDevice(deviceId: string) {
    const id = await resolveDeviceId(deviceId, "output");
    await ensureBinary();
    return throwIfStderr(await execa(binary, ["system", "set", id]));
  },

  async getOutputDeviceVolume(deviceId: string) {
    await ensureSoundControl();
    try {
      const { stdout } = await execa(soundControlBinary, ["get", deviceId]);
      const val = parseFloat(stdout.trim());
      return isNaN(val) ? undefined : val / 100;
    } catch {
      return undefined;
    }
  },

  async setOutputDeviceVolume(deviceId: string, volume: number) {
    await ensureSoundControl();
    const level = Math.round(Math.max(0, Math.min(1, volume)) * 100);
    await execa(soundControlBinary, ["set", `${level}`, deviceId]);
  },

  async getOutputDeviceMute(deviceId: string) {
    await ensureSoundControl();
    try {
      const { stdout } = await execa(soundControlBinary, ["mute", "get", deviceId]);
      return stdout.trim() === "true";
    } catch {
      return undefined;
    }
  },

  async setOutputDeviceMute(deviceId: string, muted: boolean) {
    await ensureSoundControl();
    await execa(soundControlBinary, ["mute", muted ? "on" : "off", deviceId]);
  },

  async toggleOutputDeviceMute(deviceId: string) {
    await ensureSoundControl();
    const { stdout } = await execa(soundControlBinary, ["mute", "toggle", deviceId]);
    return stdout.trim() === "true";
  },

  async getInputDeviceVolume(deviceId: string) {
    await ensureSoundControl();
    try {
      const { stdout } = await execa(soundControlBinary, ["get-input", deviceId]);
      const val = parseFloat(stdout.trim());
      return isNaN(val) ? undefined : val / 100;
    } catch {
      return undefined;
    }
  },

  async setInputDeviceVolume(deviceId: string, volume: number) {
    await ensureSoundControl();
    const level = Math.round(Math.max(0, Math.min(1, volume)) * 100);
    await execa(soundControlBinary, ["set-input", `${level}`, deviceId]);
  },

  async getInputDeviceMute(deviceId: string) {
    await ensureSoundControl();
    try {
      const { stdout } = await execa(soundControlBinary, ["mute-input", "get", deviceId]);
      return stdout.trim() === "true";
    } catch {
      return undefined;
    }
  },

  async setInputDeviceMute(deviceId: string, muted: boolean) {
    await ensureSoundControl();
    await execa(soundControlBinary, ["mute-input", muted ? "on" : "off", deviceId]);
  },

  async toggleInputDeviceMute(deviceId: string) {
    await ensureSoundControl();
    const { stdout } = await execa(soundControlBinary, ["mute-input", "toggle", deviceId]);
    return stdout.trim() === "true";
  },

  async getAllOutputVolumeInfo(): Promise<
    Record<string, { name: string; volume?: number; muted?: boolean; isDefault: boolean }>
  > {
    await ensureSoundControl();
    try {
      const { stdout } = await execa(soundControlBinary, ["get-all"]);
      const raw = JSON.parse(stdout) as Record<
        string,
        { name: string; volume?: number | null; muted?: boolean | null; isDefault: boolean }
      >;
      const result: Record<string, { name: string; volume?: number; muted?: boolean; isDefault: boolean }> = {};
      for (const [id, info] of Object.entries(raw)) {
        result[id] = {
          name: info.name,
          volume: info.volume != null ? info.volume / 100 : undefined,
          muted: info.muted ?? undefined,
          isDefault: info.isDefault,
        };
      }
      return result;
    } catch {
      return {};
    }
  },

  async getAllInputVolumeInfo(): Promise<
    Record<string, { name: string; volume?: number; muted?: boolean; isDefault: boolean }>
  > {
    await ensureSoundControl();
    try {
      const { stdout } = await execa(soundControlBinary, ["get-all-input"]);
      const raw = JSON.parse(stdout) as Record<
        string,
        { name: string; volume?: number | null; muted?: boolean | null; isDefault: boolean }
      >;
      const result: Record<string, { name: string; volume?: number; muted?: boolean; isDefault: boolean }> = {};
      for (const [id, info] of Object.entries(raw)) {
        result[id] = {
          name: info.name,
          volume: info.volume != null ? info.volume / 100 : undefined,
          muted: info.muted ?? undefined,
          isDefault: info.isDefault,
        };
      }
      return result;
    } catch {
      return {};
    }
  },

  async createAggregateDevice(
    name: string,
    mainDeviceId: string,
    otherDeviceIds?: string[],
    options?: { multiOutput?: boolean },
  ): Promise<AudioDevice> {
    await ensureBinary();
    const ids = await Promise.all([mainDeviceId, ...(otherDeviceIds || [])].map((d) => resolveDeviceId(d, "output")));
    return parseStdout(
      await execa(
        binary,
        ["aggregate", "create", "--json", options?.multiOutput ? "--multi-output" : "", name, ...ids].filter(Boolean),
      ),
    );
  },

  async destroyAggregateDevice(deviceId: string) {
    await ensureBinary();
    return throwIfStderr(await execa(binary, ["aggregate", "destroy", deviceId]));
  },
};
