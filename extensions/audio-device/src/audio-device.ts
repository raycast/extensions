import path from "path";
import { execa } from "execa";
import { environment } from "@raycast/api";
import { constants, promises as fs } from "fs";

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
  try {
    await fs.access(binary, constants.X_OK);
  } catch {
    await fs.copyFile(binaryAsset, binary);
    await fs.chmod(binary, 0o755);
  }
}

async function runAudioDevices(args: string[]) {
  await ensureBinary();
  try {
    return await execa(binary, args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`audio-devices ${args.join(" ")} failed: ${message}`);
  }
}

function throwIfStderr({ stderr }: { stderr: string }) {
  if (stderr) {
    throw new Error(stderr);
  }
}

const TRANSPORT_TYPE_MAP: Record<string, TransportType> = {
  avb: TransportType.Avb,
  aggregate: TransportType.Aggregate,
  airplay: TransportType.Airplay,
  autoaggregate: TransportType.Autoaggregate,
  bluetooth: TransportType.Bluetooth,
  bluetoothle: TransportType.BluetoothLowEnergy,
  bluetoothlowenergy: TransportType.BluetoothLowEnergy,
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

function normalizeTransportType(value: unknown): TransportType {
  if (typeof value !== "string") return TransportType.Unknown;
  const key = value.toLowerCase().replace(/[\s-]/g, "");
  return TRANSPORT_TYPE_MAP[key] ?? TransportType.Unknown;
}

function normalizeDevice(value: AudioDevice): AudioDevice {
  const transportType = normalizeTransportType(value.transportType);
  return transportType === value.transportType ? value : { ...value, transportType };
}

function parseStdout<T extends AudioDevice | AudioDevice[]>({ stdout, stderr }: { stderr: string; stdout: string }): T {
  throwIfStderr({ stderr });
  try {
    const parsed = JSON.parse(stdout) as AudioDevice | AudioDevice[];
    const normalized = Array.isArray(parsed)
      ? parsed.map((device) => normalizeDevice(device))
      : normalizeDevice(parsed);
    return normalized as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const preview = stdout.trim().slice(0, 200);
    const suffix = preview ? ` Output preview: ${preview}` : "";
    throw new Error(`Failed to parse audio-devices output: ${message}.${suffix}`);
  }
}

export async function getAllDevices(): Promise<AudioDevice[]> {
  return parseStdout<AudioDevice[]>(await runAudioDevices(["list", "--json"]));
}

export async function getInputDevices(): Promise<AudioDevice[]> {
  return parseStdout<AudioDevice[]>(await runAudioDevices(["list", "--input", "--json"]));
}

export async function getOutputDevices(): Promise<AudioDevice[]> {
  return parseStdout<AudioDevice[]>(await runAudioDevices(["list", "--output", "--json"]));
}

export async function getDevice(deviceId: string): Promise<AudioDevice> {
  return parseStdout<AudioDevice>(await runAudioDevices(["get", "--json", deviceId]));
}

export async function getDefaultOutputDevice(): Promise<AudioDevice> {
  return parseStdout<AudioDevice>(await runAudioDevices(["output", "get", "--json"]));
}

export async function getDefaultInputDevice(): Promise<AudioDevice> {
  return parseStdout<AudioDevice>(await runAudioDevices(["input", "get", "--json"]));
}

export async function getDefaultSystemDevice(): Promise<AudioDevice> {
  return parseStdout<AudioDevice>(await runAudioDevices(["system", "get", "--json"]));
}

export async function setDefaultOutputDevice(deviceId: string) {
  return throwIfStderr(await runAudioDevices(["output", "set", deviceId]));
}

export async function setDefaultInputDevice(deviceId: string) {
  return throwIfStderr(await runAudioDevices(["input", "set", deviceId]));
}

export async function setDefaultSystemDevice(deviceId: string) {
  return throwIfStderr(await runAudioDevices(["system", "set", deviceId]));
}

export async function getOutputDeviceVolume(deviceId: string) {
  const { stdout, stderr } = await runAudioDevices(["volume", "get", deviceId]);
  return stderr ? undefined : parseFloat(stdout);
}

export async function setOutputDeviceVolume(deviceId: string, volume: number) {
  return throwIfStderr(await runAudioDevices(["volume", "set", deviceId, `${volume}`]));
}

export async function createAggregateDevice(
  name: string,
  mainDeviceId: string,
  otherDeviceIds?: string[],
  options?: { multiOutput?: boolean },
): Promise<AudioDevice> {
  return parseStdout<AudioDevice>(
    await runAudioDevices(
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
  return throwIfStderr(await runAudioDevices(["aggregate", "destroy", deviceId]));
}
