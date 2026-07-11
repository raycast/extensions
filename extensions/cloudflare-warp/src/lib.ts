import { getPreferenceValues } from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { ConnectionStatus, StatusResult, VirtualNetwork, VNetResult } from "./types";

const execPromise = promisify(exec);

const { wrapCliPath } = getPreferenceValues<Preferences>();
const DEFAULT_WRAP_CLI_PATH = "/Applications/Cloudflare WARP.app/Contents/Resources/warp-cli";
const wrapCliCmd = wrapCliPath ?? DEFAULT_WRAP_CLI_PATH;

export async function execCommand<T>(cmd: string): Promise<T> {
  const { stdout } = await execPromise(`"${wrapCliCmd}" -j ${cmd}`);
  return JSON.parse(stdout);
}

export async function toggleWarpConnection(command: "connect" | "disconnect"): Promise<boolean> {
  try {
    const { status } = await execCommand<{ status: string }>(command);
    if (status === "Success") return true;

    throw new Error(`Failed to ${command}`);
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function getWarpStatus(): Promise<StatusResult> {
  const { status, reason } = await execCommand<{ status: string; reason?: string }>("status");

  switch (status) {
    case "Disconnected": {
      return {
        status: ConnectionStatus.Disconnected,
        disconnectReason: reason ?? "unknown",
      };
    }
    case "Connected": {
      return { status: ConnectionStatus.Connected, disconnectReason: "" };
    }
    default: {
      return { status: ConnectionStatus.Unknown, disconnectReason: "unknown" };
    }
  }
}

export async function getVirtualNetworks(): Promise<VirtualNetwork[]> {
  const { active_vnet_id: activeVnetId, virtual_networks: virtualNetwork } = await execCommand<VNetResult>("vnet");

  return virtualNetwork.map((network) => ({
    ...network,
    active: network.id === activeVnetId,
  }));
}

export async function getMDMProfiles(): Promise<{ available: string[]; active: string }> {
  return await execCommand<{ available: string[]; active: string }>("mdm get-configs");
}

async function runCommandWithReconnect(command: string, errorMessage: string): Promise<boolean> {
  try {
    const disconnected = await toggleWarpConnection("disconnect");
    if (!disconnected) throw new Error("Failed to disconnect");

    const { status } = await execCommand<{ status: string }>(command);
    if (status !== "Success") throw new Error(errorMessage);

    const connected = await toggleWarpConnection("connect");
    if (!connected) throw new Error("Failed to reconnect");

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function switchVirtualNetwork(id: string): Promise<boolean> {
  return runCommandWithReconnect(`vnet ${id}`, "Failed to switch network");
}

export async function setMDMProfile(profile: string): Promise<boolean> {
  return runCommandWithReconnect(`mdm set-config ${profile}`, "Failed to set MDM profile");
}
