import { Instance, tokenForInstance } from "./instances";

export interface ServerHealth {
  diskUsedBytes: number;
  diskTotalBytes: number;
  memUsedBytes: number;
  memTotalBytes: number;
  containerCount: number;
}

interface RawServerHealth {
  error?: string | null;
  containers: { containerCount: number };
  resources: { memUsedBytes: number; memTotalBytes: number };
  disk: { usedBytes: number; totalBytes: number };
}

/**
 * Host-level diagnostics for the instance's own Dokploy server (no `serverId` - remote servers
 * aren't scoped here, out of scope for this command). Confirmed live against a real instance to
 * work over the plain REST bridge, not raw-tRPC-only like `deployment.*`/`<kind>.readLogs`.
 *
 * Deliberately not `server.getServerMetrics` - that route needs Dokploy's own opt-in monitoring
 * daemon manually enabled per server first, which most self-hosted instances (this extension's
 * whole audience) won't have set up. `docker.getServerHealth` runs a one-off diagnostic script over
 * SSH instead, so it works out of the box everywhere, at the cost of not having a CPU usage
 * percentage (only a core count) - a fair trade for a command running as a periodic background
 * fetch across every configured instance.
 */
export async function fetchServerHealth(instance: Instance): Promise<ServerHealth> {
  const { url, headers } = tokenForInstance(instance);
  const response = await fetch(url + "docker.getServerHealth", { headers });
  if (!response.ok) throw new Error(`${response.status}`);
  const raw = (await response.json()) as RawServerHealth;
  // Dokploy still answers `200` when the diagnostic script itself failed (or its output couldn't be
  // parsed) - `emptyResult()` on the server side fills every metric with `0` and sets `error` instead
  // of rejecting the request. Left unchecked, those zeros read as real data (an instance that
  // couldn't be checked would render as "Disk: 0.0 GB / 0.0 GB" and never trip the threshold).
  if (raw.error) throw new Error(raw.error);
  return {
    diskUsedBytes: raw.disk.usedBytes,
    diskTotalBytes: raw.disk.totalBytes,
    memUsedBytes: raw.resources.memUsedBytes,
    memTotalBytes: raw.resources.memTotalBytes,
    containerCount: raw.containers.containerCount,
  };
}

export function diskPercent(health: ServerHealth): number {
  return health.diskTotalBytes > 0 ? (health.diskUsedBytes / health.diskTotalBytes) * 100 : 0;
}

export function formatGB(bytes: number): string {
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}
