import { execFile } from "child_process";
import { environment } from "@raycast/api";
import path from "path";

const CLI = path.join(environment.assetsPath, "cli", "WinBluetoothCli.exe");

// ── Domain types (mirror Program.cs DeviceDto) ────────────────────────────────

export interface Device {
  id: string;
  name: string;
  isPaired: boolean;
  isConnected: boolean;
  canPair: boolean;
  deviceKind: "Classic" | "LE";
  deviceAddress?: string;
  bluetoothAddress?: number;
}

export interface BluetoothStatus {
  available: boolean;
  enabled: boolean;
  adapterName?: string;
  state?: string;
}

export interface CliResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AudioEndpoint {
  id: string; // full WinRT DeviceInformation ID
  endpointId: string; // stripped MMDEVAPI ID for IPolicyConfig
  name: string;
  isDefaultOutput: boolean;
  isDefaultComms: boolean;
}

// ── Core runner ───────────────────────────────────────────────────────────────

export function runCli<T = unknown>(
  ...args: [...string[]] | [...string[], { timeout: number }]
): Promise<CliResult<T>> {
  const lastArg = args[args.length - 1];
  const hasOpts =
    typeof lastArg === "object" && lastArg !== null && "timeout" in lastArg;
  const cliArgs = (hasOpts ? args.slice(0, -1) : args) as string[];
  const timeout = hasOpts ? (lastArg as { timeout: number }).timeout : 20_000;

  return new Promise((resolve) => {
    execFile(CLI, cliArgs, { timeout }, (err, stdout) => {
      const raw = stdout?.trim();
      if (!raw) {
        resolve({
          success: false,
          error: err?.message ?? "No output from CLI",
        });
        return;
      }
      try {
        resolve(JSON.parse(raw) as CliResult<T>);
      } catch {
        resolve({
          success: false,
          error: `Bad CLI output: ${raw.slice(0, 200)}`,
        });
      }
    });
  });
}

// ── API surface ───────────────────────────────────────────────────────────────

export const listDevices = () =>
  runCli<Device[]>("list").then((r) => r.data ?? []);

export const connectDevice = (id: string) => runCli("connect", id);

export const disconnectDevice = (id: string) => runCli("disconnect", id);

export const removeDevice = (id: string) => runCli("remove", id);

export const pairDevice = (id: string) => runCli("pair", id);

export const toggleBluetooth = () =>
  runCli<{ bluetoothEnabled: boolean; adapterName: string }>("toggle");

export const getStatus = () => runCli<BluetoothStatus>("status");

// scan does active radio inquiry — allow up to 15 s (CLI hard-caps at 10 s internally)
export const scanDevices = () =>
  runCli<Device[]>("scan", { timeout: 15_000 }).then((r) => r.data ?? []);

export const getDeviceInfo = (id: string) => runCli("info", id);

export const listAudioEndpoints = () =>
  runCli<AudioEndpoint[]>("audio-list").then((r) => r.data ?? []);

export const setAudioDefault = (endpointId: string) =>
  runCli("set-audio", endpointId);

/**
 * Finds the audio endpoint that best matches a Bluetooth device by name.
 * Windows typically names the audio endpoint after the Bluetooth device
 * (e.g. BT device "AirPods Pro" → audio endpoint "AirPods Pro Stereo").
 */
export function matchAudioEndpoint(
  deviceName: string,
  endpoints: AudioEndpoint[],
): AudioEndpoint | undefined {
  const dn = deviceName.toLowerCase();
  // Exact name match first
  const exact = endpoints.find((e) => e.name.toLowerCase() === dn);
  if (exact) return exact;
  // BT device name appears inside audio endpoint name (most common case)
  const sub = endpoints.find((e) => e.name.toLowerCase().includes(dn));
  if (sub) return sub;
  // Audio endpoint name appears inside BT device name (less common)
  return endpoints.find((e) => dn.includes(e.name.toLowerCase()));
}
