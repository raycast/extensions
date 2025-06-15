import { getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import util from "util";
const execPromise = util.promisify(exec);

const preferences: { wrapCliPath: string } = getPreferenceValues();
const DEFAULT_WRAP_CLI_PATH = "/Applications/Cloudflare WARP.app/Contents/Resources/warp-cli";
const wrapCliCmd = preferences.wrapCliPath ?? DEFAULT_WRAP_CLI_PATH;

export async function execCommand<T>(cmd: string): Promise<T> {
  const { stdout } = await execPromise(`"${wrapCliCmd}" -j ${cmd}`);
  return JSON.parse(stdout);
}

export async function connectToWarp(): Promise<boolean> {
  try {
    const { status } = await execCommand<{ status: string }>("connect");
    if (status === "Success") {
      return true;
    }
    throw new Error("Failed to connect");
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function disconnectFromWarp(): Promise<boolean> {
  try {
    const { status } = await execCommand<{ status: string }>("disconnect");
    if (status === "Success") {
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
  const { status, reason } = await execCommand<{ status: string; reason?: string }>("status");
  if (status === "Disconnected") {
    return { status: ConnectionStatus.Disconnected, disconnectReason: reason ?? "unknown" };
  }
  if (status === "Connected") {
    return { status: ConnectionStatus.Connected, disconnectReason: "" };
  }
  return { status: ConnectionStatus.Unknown, disconnectReason: "unknown" };
}

export type VirtualNetwork = {
  id: string;
  name: string;
  description: string;
  default: boolean;
  active: boolean;
};

type VNetResult = {
  active_vnet_id: string;
  virtual_networks: {
    id: string;
    name: string;
    description: string;
    default: boolean;
  }[];
};
export async function getVirtualNetworks(): Promise<VirtualNetwork[]> {
  const { active_vnet_id: activeVnetId, virtual_networks: virtualNetwork } = await execCommand<VNetResult>("vnet");
  const networks = virtualNetwork.map((network) => {
    return {
      id: network.id,
      name: network.name,
      description: network.description,
      default: network.default,
      active: network.id === activeVnetId,
    };
  });

  return networks;
}

export async function switchVirtualNetwork(id: string): Promise<boolean> {
  try {
    const disconnected = await disconnectFromWarp();
    if (!disconnected) {
      throw new Error("Failed to disconnect");
    }
    const { status } = await execCommand<{ status: string }>(`vnet ${id}`);
    if (status !== "Success") {
      throw new Error("Failed to switch network");
    }
    const connectStatus = await connectToWarp();
    if (!connectStatus) {
      throw new Error("Failed to connect");
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
