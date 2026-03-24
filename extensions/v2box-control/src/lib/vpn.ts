import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scutilPath = "/usr/sbin/scutil";

type NetworkCommandAction = "status" | "start" | "stop";
type ExecFileError = Error & { stdout?: string; stderr?: string };

export type VpnState =
  | "connected"
  | "connecting"
  | "disconnected"
  | "disconnecting"
  | "invalid"
  | "unknown";

export interface VpnStatus {
  state: VpnState;
  raw: string;
}

function normalizeOutput(stdout?: string, stderr?: string): string {
  return [stdout?.trim(), stderr?.trim()].filter(Boolean).join("\n");
}

function getServiceName(): string {
  const { serviceName } = getPreferenceValues<Preferences>();
  const value = serviceName.trim();

  if (!value) {
    throw new Error("Set VPN Service Name in Raycast extension preferences");
  }

  return value;
}

async function runScutil(action: NetworkCommandAction): Promise<string> {
  const serviceName = getServiceName();

  try {
    const { stdout, stderr } = await execFileAsync(scutilPath, [
      "--nc",
      action,
      serviceName,
    ]);
    return normalizeOutput(stdout, stderr);
  } catch (error) {
    const execError = error as ExecFileError;
    const output = normalizeOutput(execError.stdout, execError.stderr);
    const message =
      output ||
      execError.message ||
      `scutil --nc ${action} "${serviceName}" failed`;
    throw new Error(message);
  }
}

function parseState(raw: string): VpnState {
  const stateLine = raw
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean)
    ?.toLowerCase();

  if (!stateLine) return "unknown";

  if (stateLine.includes("disconnecting")) return "disconnecting";
  if (stateLine.includes("connecting")) return "connecting";
  if (stateLine.includes("disconnected")) return "disconnected";
  if (stateLine.includes("connected")) return "connected";
  if (stateLine.includes("invalid")) return "invalid";

  return "unknown";
}

export function formatState(state: VpnState): string {
  switch (state) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting";
    case "disconnected":
      return "Disconnected";
    case "disconnecting":
      return "Disconnecting";
    case "invalid":
      return "Invalid";
    default:
      return "Unknown";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollStatus(
  targetState: "connected" | "disconnected",
  maxAttempts = 10,
  interval = 100,
): Promise<VpnStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getVpnStatus();
    if (status.state === targetState) {
      return status;
    }
    await sleep(interval);
  }
  return getVpnStatus();
}

export async function getVpnStatus(): Promise<VpnStatus> {
  const raw = await runScutil("status");
  return {
    state: parseState(raw),
    raw,
  };
}

export async function turnOnVpn(): Promise<VpnStatus> {
  await runScutil("start");
  return pollStatus("connected");
}

export async function turnOffVpn(): Promise<VpnStatus> {
  await runScutil("stop");
  return pollStatus("disconnected");
}

export async function toggleVpn(): Promise<VpnStatus> {
  const status = await getVpnStatus();

  switch (status.state) {
    case "connected":
    case "connecting":
      return turnOffVpn();
    case "disconnected":
      return turnOnVpn();
    case "disconnecting":
      throw new Error(
        "VPN is currently disconnecting, please try again shortly",
      );
    case "invalid":
      throw new Error("VPN service is invalid");
    default:
      throw new Error(`Unable to toggle VPN from ${formatState(status.state)}`);
  }
}
