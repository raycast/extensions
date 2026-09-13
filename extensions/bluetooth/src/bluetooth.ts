import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { environment } from "@raycast/api";

const run = promisify(execFile);

/** Windows PowerShell 5.1, not pwsh: the WinRT type accelerators only exist there. */
const POWERSHELL = "powershell.exe";
const SCRIPT = join(environment.assetsPath, "bluetooth.ps1");

/** Toggling the radio is quick; connecting blocks ~3s per device inside the driver. */
const TIMEOUT_MS = 30_000;

export type RadioState = "On" | "Off";

export type Device = {
  /** Uppercase MAC without separators, e.g. `F85C7E421CDA`. Unique per device. */
  address: string;
  name: string;
  connected: boolean;
  /** False for LE peripherals, which Windows connects on its own. */
  connectable: boolean;
};

type Payload = {
  radio?: RadioState;
  devices?: Device[];
  error?: string;
};

async function invoke(action: string, address?: string): Promise<Payload> {
  const args = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", SCRIPT, "-Action", action];
  if (address) args.push("-Address", address);

  let stdout: string;
  try {
    ({ stdout } = await run(POWERSHELL, args, {
      timeout: TIMEOUT_MS,
      windowsHide: true,
    }));
  } catch (error) {
    // A non-zero exit still carries our JSON error on stdout; anything else is fatal.
    const output = (error as { stdout?: string }).stdout?.trim();
    if (!output) throw error;
    stdout = output;
  }

  const payload = JSON.parse(stdout) as Payload;
  if (payload.error) throw new Error(payload.error);
  return payload;
}

export async function listDevices(): Promise<{
  radio: RadioState;
  devices: Device[];
}> {
  const { radio = "Off", devices = [] } = await invoke("list");
  return { radio, devices };
}

/** Cheaper than {@link listDevices}: skips device enumeration. */
export async function getRadio(): Promise<RadioState> {
  const { radio = "Off" } = await invoke("status");
  return radio;
}

export async function setRadio(state: RadioState): Promise<void> {
  await invoke(state === "On" ? "on" : "off");
}

export async function setConnected(address: string, connected: boolean): Promise<void> {
  await invoke(connected ? "connect" : "disconnect", address);
}
