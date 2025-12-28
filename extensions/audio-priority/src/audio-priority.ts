import path from "path";
import { execa } from "execa";
import { environment } from "@raycast/api";
import fs from "fs";

export enum TransportType {
  Avb = "AVB",
  Aggregate = "Aggregate",
  Airplay = "AirPlay",
  Autoaggregate = "Autoaggregate",
  Bluetooth = "Bluetooth",
  BluetoothLowEnergy = "Bluetooth",
  "Built-In" = "Built In",
  DisplayPort = "DisplayPort",
  Firewire = "Firewire",
  HDMI = "HDMI",
  PCI = "PCI",
  Thunderbolt = "Thunderbolt",
  Usb = "USB",
  Virtual = "Virtual",
  Unknown = "Unknown",
}

const TRANSPORT_TYPE_MAP: Record<string, TransportType> = {
  avb: TransportType.Avb,
  aggregate: TransportType.Aggregate,
  airplay: TransportType.Airplay,
  autoaggregate: TransportType.Autoaggregate,
  bluetooth: TransportType.Bluetooth,
  bluetoothle: TransportType.BluetoothLowEnergy,
  builtin: TransportType["Built-In"],
  displayport: TransportType.DisplayPort,
  firewire: TransportType.Firewire,
  hdmi: TransportType.HDMI,
  pci: TransportType.PCI,
  thunderbolt: TransportType.Thunderbolt,
  usb: TransportType.Usb,
  virtual: TransportType.Virtual,
  unknown: TransportType.Unknown,
};

export type AudioPriorityDevice = {
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
  const parsed = JSON.parse(stdout);
  if (Array.isArray(parsed)) {
    return parsed.map((device) => normalizeDevice(device));
  }
  return normalizeDevice(parsed);
}

function normalizeDevice(value: AudioPriorityDevice) {
  if (!value) return value;
  const transportType = normalizeTransportType(value.transportType);
  return transportType === value.transportType ? value : { ...value, transportType };
}

function normalizeTransportType(value: unknown): TransportType | unknown {
  if (typeof value !== "string") return value;
  return TRANSPORT_TYPE_MAP[value.toLowerCase()] ?? value;
}

export async function getAllDevices(): Promise<AudioPriorityDevice[]> {
  await ensureBinary();
  return parseStdout(await execa(binary, ["list", "--json"]));
}

export async function getInputDevices(): Promise<AudioPriorityDevice[]> {
  await ensureBinary();
  return parseStdout(await execa(binary, ["list", "--input", "--json"]));
}

export async function getOutputDevices(): Promise<AudioPriorityDevice[]> {
  await ensureBinary();
  return parseStdout(await execa(binary, ["list", "--output", "--json"]));
}

export async function getDevice(deviceId: string): Promise<AudioPriorityDevice> {
  await ensureBinary();
  return parseStdout(await execa(binary, ["get", "--json", deviceId]));
}

export async function getDefaultOutputDevice(): Promise<AudioPriorityDevice> {
  await ensureBinary();
  return parseStdout(await execa(binary, ["output", "get", "--json"]));
}

export async function getDefaultInputDevice(): Promise<AudioPriorityDevice> {
  await ensureBinary();
  return parseStdout(await execa(binary, ["input", "get", "--json"]));
}

export async function getDefaultSystemDevice(): Promise<AudioPriorityDevice> {
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
): Promise<AudioPriorityDevice> {
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
