import {
  getStatus as defaultGetStatus,
  startTunnel as defaultStartTunnel,
  type Status,
} from "./process";
import type { Tunnel } from "./store";

export type ReconnectFailure = {
  id: string;
  name: string;
  error: string;
};

export type ReconnectResult = {
  started: string[];
  skipped: string[];
  failed: ReconnectFailure[];
};

type ReconnectDependencies = {
  getStatus?: (tunnel: Tunnel) => Status;
  startTunnel?: (tunnel: Tunnel) => Promise<void>;
};

export async function reconnectTunnels(
  tunnels: Tunnel[],
  dependencies: ReconnectDependencies = {},
): Promise<ReconnectResult> {
  const getStatus = dependencies.getStatus ?? defaultGetStatus;
  const startTunnel = dependencies.startTunnel ?? defaultStartTunnel;
  const result: ReconnectResult = { started: [], skipped: [], failed: [] };

  for (const tunnel of tunnels) {
    if (!tunnel.autoReconnect) continue;

    if (getStatus(tunnel) === "running") {
      result.skipped.push(tunnel.id);
      continue;
    }

    try {
      await startTunnel(tunnel);
      result.started.push(tunnel.id);
    } catch (err) {
      result.failed.push({
        id: tunnel.id,
        name: tunnel.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
