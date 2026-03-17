import path from "path";
import { execa } from "execa";
import { environment } from "@raycast/api";
import fs from "fs";
import type { PlatformAudioAPI, AudioDevice } from "./index";

const binaryAsset = path.join(environment.assetsPath, "audio-devices");
const binary = path.join(environment.supportPath, "audio-devices");

async function ensureBinary() {
  if (!fs.existsSync(binary)) {
    fs.copyFileSync(binaryAsset, binary);
    await execa("chmod", ["+x", binary]);
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
    await ensureBinary();
    const { stdout, stderr } = await execa(binary, ["volume", "get", deviceId]);
    return stderr ? undefined : parseFloat(stdout);
  },

  async setOutputDeviceVolume(deviceId: string, volume: number) {
    await ensureBinary();
    return throwIfStderr(await execa(binary, ["volume", "set", deviceId, `${volume}`]));
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
