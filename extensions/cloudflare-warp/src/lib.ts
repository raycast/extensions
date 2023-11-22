import { getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import util from "util";
const execPromise = util.promisify(exec);

const preferences: { wrapCliPath: string } = getPreferenceValues();
const DEFAULT_WRAP_CLI_PATH = "/Applications/Cloudflare WARP.app/Contents/Resources/warp-cli";
const wrapCliCmd = preferences.wrapCliPath ?? DEFAULT_WRAP_CLI_PATH;

export function execCommand(cmd: string) {
  return execPromise(`"${wrapCliCmd}" ${cmd}`);
}

export async function connectToWarp(): Promise<Boolean> {
  try {
    const { stdout } = await execCommand("connect");
    if (stdout.includes("Success")) {
      return true;
    }
    throw new Error("Failed to connect");
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function disconnectFromWarp(): Promise<Boolean> {
  try {
    const { stdout } = await execCommand("disconnect");
    if (stdout.includes("Success")) {
      return true;
    }
    throw new Error("Failed to connect");
  } catch (e) {
    console.error(e);
    return false;
  }
}

export enum ConnectionStatus {
  Connected = "connected",
  Disconnected = "disconnected",
  Unknown = "unknown",
}
export type StatusResult = {
  status: ConnectionStatus;
  disconnectReason: string;
};
export async function getWarpStatus(): Promise<StatusResult> {
  const { stdout } = await execCommand("status");
  const lines = stdout.trim().split("\n");
  if (lines.length < 2) {
    return { status: ConnectionStatus.Disconnected, disconnectReason: "unknown" };
  }
  if (lines[1].includes("Disconnected")) {
    return {
      status: ConnectionStatus.Disconnected,
      disconnectReason: lines[1].substring("Status update: Disconnected. Reason: ".length),
    };
  }
  if (lines[1].includes("Connected")) {
    return { status: ConnectionStatus.Connected, disconnectReason: "" };
  }
  return { status: ConnectionStatus.Unknown, disconnectReason: "unknown" };
}

export type VirtualNetwork = {
  id: string;
  name: string;
  comment: string;
  default: boolean;
  active: boolean;
};

export async function getVirtualNetworks(): Promise<VirtualNetwork[]> {
  const { stdout } = await execCommand("get-virtual-networks");
  const lines = stdout.trim().split("\n");
  const currentlySelected = lines[0].split(" ")[1];
  const rawData = lines.slice(2).filter((line) => line !== "");

  const networks = [];
  let i = 0;
  while (i < rawData.length) {
    if (i + 4 > rawData.length) break;
    const [id, name, comment, defaultNetwork] = rawData.slice(i, i + 4);
    networks.push({
      id: id.substring(4),
      name: name.substring(6),
      comment: comment.substring(8),
      default: defaultNetwork === "true",
      active: id === currentlySelected,
    });
    i += 4;
  }
  return networks;
}

export async function switchVirtualNetwork(id: string): Promise<Boolean> {
  try {
    const disconnected = await disconnectFromWarp();
    if (!disconnected) {
      throw new Error("Failed to disconnect");
    }
    const { stdout } = await execCommand(`set-virtual-network ${id}`);
    if (!stdout.includes("Success")) {
      throw new Error("Failed to switch network");
    }
    const connectStatus = await connectToWarp;
    if (!connectStatus) {
      throw new Error("Failed to connect");
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
