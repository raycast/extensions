import path from "path";
import { execa } from "execa";
import { environment } from "@raycast/api";
import fs from "fs";

export enum TransportType {
  Avb = "avb",
  Aggregate = "aggregate",
  Airplay = "airplay",
  Autoaggregate = "autoaggregate",
  Bluetooth = "bluetooth",
  BluetoothLowEnergy = "bluetoothle",
  "Built-In" = "builtin",
  DisplayPort = "displayport",
  Firewire = "firewire",
  HDMI = "hdmi",
  PCI = "pci",
  Thunderbolt = "thunderbolt",
  Usb = "usb",
  Virtual = "virtual",
  Unknown = "unknown",
}

export type AudioDevice = {
  name: string;
  isInput: boolean;
  isOutput: boolean;
  id: string;
  uid: string;
  transportType: TransportType;
};

const binaryAsset = path.join(environment.assetsPath, "audio-devices");
const binary = path.join(environment.supportPath, "audio-devices");

async function ensureBinary() {
  if (!fs.existsSync(binary)) {
    await execa("cp", [binaryAsset, binary]);
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

export async function getAllDevices(): Promise<AudioDevice[]> {
  await ensureBinary();
  return parseStdout(await execa(binary, ["list", "--json"]));
}

export async function getInputDevices(): Promise<AudioDevice[]> {
  await ensureBinary();
  return parseStdout(await execa(binary, ["list", "--input", "--json"]));
}

export async function getOutputDevices(): Promise<AudioDevice[]> {
  await ensureBinary();
  return parseStdout(await execa(binary, ["list", "--output", "--json"]));
}

export async function getDevice(deviceId: string): Promise<AudioDevice> {
  await ensureBinary();
  return parseStdout(await execa(binary, ["get", "--json", deviceId]));
}

export async function getDefaultOutputDevice(): Promise<AudioDevice> {
  await ensureBinary();
  return parseStdout(await execa(binary, ["output", "get", "--json"]));
}

export async function getDefaultInputDevice(): Promise<AudioDevice> {
  await ensureBinary();
  return parseStdout(await execa(binary, ["input", "get", "--json"]));
}

export async function getDefaultSystemDevice(): Promise<AudioDevice> {
  await ensureBinary();
  return parseStdout(await execa(binary, ["system", "get", "--json"]));
}

export async function setDefaultOutputDevice(deviceId: string) {
  await ensureBinary();
  return throwIfStderr(await execa(binary, ["output", "set", deviceId]));
}

export async function setDefaultInputDevice(deviceId: string) {
  await ensureBinary();
  return throwIfStderr(await execa(binary, ["input", "set", deviceId]));
}

export async function setDefaultSystemDevice(deviceId: string) {
  await ensureBinary();
  return throwIfStderr(await execa(binary, ["system", "set", deviceId]));
}

export async function getOutputDeviceVolume(deviceId: string) {
  await ensureBinary();
  const { stdout, stderr } = await execa(binary, ["volume", "get", deviceId]);
  return stderr ? undefined : parseFloat(stdout);
}

export async function setOutputDeviceVolume(deviceId: string, volume: number) {
  await ensureBinary();
  return throwIfStderr(await execa(binary, ["volume", "set", deviceId, `${volume}`]));
}

export async function createAggregateDevice(
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
}

export async function destroyAggregateDevice(deviceId: string) {
  await ensureBinary();
  return throwIfStderr(await execa(binary, ["aggregate", "destroy", deviceId]));
}
