import path from "path";
import { execa } from "execa";
import { environment } from "@raycast/api";
import fs from "fs";
import type { PlatformAudioAPI, AudioDevice } from "./index";

const binaryAsset = path.join(environment.assetsPath, "audio-devices");
const binary = path.join(environment.supportPath, "audio-devices");

const soundControlAsset = path.join(environment.assetsPath, "sound-control");
const soundControlBinary = path.join(environment.supportPath, "sound-control");

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

export const macosAudioAPI: PlatformAudioAPI = {
  async getAllDevices(): Promise<AudioDevice[]> {
    await ensureBinary();
    return parseStdout(await execa(binary, ["list", "--json"]));
  },

  async getInputDevices(): Promise<AudioDevice[]> {
    await ensureBinary();
    return parseStdout(await execa(binary, ["list", "--input", "--json"]));
  },

  async getOutputDevices(): Promise<AudioDevice[]> {
    await ensureBinary();
    return parseStdout(await execa(binary, ["list", "--output", "--json"]));
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
    await ensureBinary();
    return throwIfStderr(await execa(binary, ["output", "set", deviceId]));
  },

  async setDefaultInputDevice(deviceId: string) {
    await ensureBinary();
    return throwIfStderr(await execa(binary, ["input", "set", deviceId]));
  },

  async setDefaultSystemDevice(deviceId: string) {
    await ensureBinary();
    return throwIfStderr(await execa(binary, ["system", "set", deviceId]));
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
    return parseStdout(
      await execa(
        binary,
        [
          "aggregate",
          "create",
          "--json",
          options?.multiOutput ? "--multi-output" : "",
          name,
          mainDeviceId,
          ...(otherDeviceIds || []),
        ].filter(Boolean),
      ),
    );
  },

  async destroyAggregateDevice(deviceId: string) {
    await ensureBinary();
    return throwIfStderr(await execa(binary, ["aggregate", "destroy", deviceId]));
  },
};
