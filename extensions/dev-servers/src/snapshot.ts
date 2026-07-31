import { Cache, LaunchType, launchCommand } from "@raycast/api";
import { DevServer } from "./types";

const SNAPSHOT_KEY = "servers-snapshot";
const cache = new Cache();

interface SnapshotPayload {
  savedAt: string;
  servers: Array<Omit<DevServer, "startedAt"> & { startedAt: string }>;
}

export function writeSnapshot(servers: DevServer[]): void {
  const payload: SnapshotPayload = {
    savedAt: new Date().toISOString(),
    servers: servers.map((server) => ({
      ...server,
      startedAt: server.startedAt.toISOString(),
    })),
  };
  cache.set(SNAPSHOT_KEY, JSON.stringify(payload));
}

export function readSnapshot(): DevServer[] | null {
  const raw = cache.get(SNAPSHOT_KEY);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as SnapshotPayload;
    if (!payload || !Array.isArray(payload.servers)) return null;
    return payload.servers.map((server) => {
      const startedAt = new Date(server.startedAt);
      if (Number.isNaN(startedAt.getTime())) throw new Error("Bad snapshot");
      return {
        ...server,
        startedAt,
      };
    });
  } catch {
    return null;
  }
}

export function pokeMenuBar(): void {
  try {
    launchCommand({
      name: "menubar",
      type: LaunchType.Background,
    }).catch(() => {});
  } catch {
    // The menu bar command can be disabled per-user; callers should never
    // fail just because the optional companion surface is unavailable.
  }
}
