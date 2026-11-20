import { Aria2Settings, Aria2Task, Aria2Version, GlobalStat } from "./types";
import { loadSettings, readSecret } from "./state";

export class RpcError extends Error {
  readonly code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.name = "RpcError";
    this.code = code;
  }
}

interface RpcResponse<T> {
  jsonrpc?: string;
  id?: string | number;
  result?: T;
  error?: { code?: number; message?: string };
}

export interface Aria2Connection {
  endpoint: string;
  secret: string | null;
  settings: Aria2Settings;
}

export async function getConnection(): Promise<Aria2Connection> {
  const settings = await loadSettings();
  if (!settings) {
    throw new RpcError(
      "aria2 is not configured yet. Open Toggle Aria2 or Add Download to initialize it automatically.",
      2,
    );
  }
  const endpoint = `http://127.0.0.1:${settings.rpcPort}/jsonrpc`;
  const secret = await readSecret();
  return { endpoint, secret, settings };
}

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const { endpoint, secret } = await getConnection();
  const requestParams = secret ? [`token:${secret}`, ...params] : params;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `aria2-raycast-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        method,
        params: requestParams,
      }),
      signal: controller.signal,
    });

    if (response.status === 401) {
      throw new RpcError(
        "aria2 RPC unauthorized: the secret does not match.",
        401,
      );
    }
    if (!response.ok) {
      throw new RpcError(`aria2 RPC HTTP ${response.status}`, response.status);
    }

    const payload = (await response.json()) as RpcResponse<T>;
    if (payload.error) {
      throw new RpcError(
        payload.error.message ??
          `aria2 RPC error ${payload.error.code ?? ""}`.trim(),
        payload.error.code,
      );
    }
    if (payload.result === undefined) {
      throw new RpcError("aria2 RPC returned no result");
    }
    return payload.result;
  } catch (error) {
    if (error instanceof RpcError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new RpcError("aria2 RPC timed out");
    }
    throw new RpcError(
      error instanceof Error ? error.message : "aria2 RPC failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function getVersion(): Promise<Aria2Version> {
  return rpc<Aria2Version>("aria2.getVersion");
}

export async function isDaemonRunning(): Promise<boolean> {
  try {
    await getVersion();
    return true;
  } catch {
    return false;
  }
}

export async function getGlobalStat(): Promise<GlobalStat> {
  return rpc<GlobalStat>("aria2.getGlobalStat");
}

export type DaemonState = "stopped" | "running" | "busy" | "error";

export interface DaemonStatus {
  state: DaemonState;
  active: number;
  waiting: number;
  downloadSpeed: string;
  error?: string;
}

export async function getDaemonStatus(): Promise<DaemonStatus> {
  try {
    await getVersion();
  } catch (error) {
    if (error instanceof RpcError && error.code === 401) {
      return {
        state: "error",
        active: 0,
        waiting: 0,
        downloadSpeed: "0",
        error: error.message,
      };
    }
    return { state: "stopped", active: 0, waiting: 0, downloadSpeed: "0" };
  }

  try {
    const stat = await getGlobalStat();
    const active = Number.parseInt(stat.numActive || "0", 10) || 0;
    const waiting = Number.parseInt(stat.numWaiting || "0", 10) || 0;
    return {
      state: active + waiting > 0 ? "busy" : "running",
      active,
      waiting,
      downloadSpeed: stat.downloadSpeed || "0",
    };
  } catch (error) {
    return {
      state: "error",
      active: 0,
      waiting: 0,
      downloadSpeed: "0",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function tellActive(): Promise<Aria2Task[]> {
  return rpc<Aria2Task[]>("aria2.tellActive");
}

export async function tellWaiting(
  offset = 0,
  num = 1000,
): Promise<Aria2Task[]> {
  return rpc<Aria2Task[]>("aria2.tellWaiting", [offset, num]);
}

export async function tellStopped(
  offset = 0,
  num = 1000,
): Promise<Aria2Task[]> {
  return rpc<Aria2Task[]>("aria2.tellStopped", [offset, num]);
}

export async function tellStatus(
  gid: string,
  keys?: string[],
): Promise<Aria2Task> {
  if (keys && keys.length > 0) {
    return rpc<Aria2Task>("aria2.tellStatus", [gid, keys]);
  }
  return rpc<Aria2Task>("aria2.tellStatus", [gid]);
}

export async function getAllTasks(): Promise<Aria2Task[]> {
  const [active, waiting, stopped] = await Promise.all([
    tellActive(),
    tellWaiting(),
    tellStopped(),
  ]);
  const seen = new Set<string>();
  return [...active, ...waiting, ...stopped].filter((task) => {
    if (task.status === "removed") return false;
    // A completed magnet metadata task is superseded by its followedBy task.
    if (
      task.status === "complete" &&
      task.files?.[0]?.path?.startsWith("[METADATA]")
    ) {
      return false;
    }
    if (seen.has(task.gid)) return false;
    seen.add(task.gid);
    return true;
  });
}

export async function addUri(
  uris: string[],
  options: Record<string, string | string[]> = {},
): Promise<string> {
  return rpc<string>("aria2.addUri", [uris, options]);
}

export async function addTorrent(
  torrentBase64: string,
  options: Record<string, string | string[]> = {},
): Promise<string> {
  return rpc<string>("aria2.addTorrent", [torrentBase64, [], options]);
}

export async function pauseTask(gid: string): Promise<string> {
  return rpc<string>("aria2.pause", [gid]);
}

export async function resumeTask(gid: string): Promise<string> {
  return rpc<string>("aria2.unpause", [gid]);
}

export async function removeTask(gid: string): Promise<string> {
  return rpc<string>("aria2.remove", [gid]);
}

export async function removeTaskResult(gid: string): Promise<string> {
  return rpc<string>("aria2.removeDownloadResult", [gid]);
}

export async function pauseAll(): Promise<string> {
  return rpc<string>("aria2.pauseAll");
}

export async function unpauseAll(): Promise<string> {
  return rpc<string>("aria2.unpauseAll");
}

export async function purgeDownloadResult(): Promise<string> {
  return rpc<string>("aria2.purgeDownloadResult");
}

export async function changeGlobalOption(
  options: Record<string, string>,
): Promise<string> {
  return rpc<string>("aria2.changeGlobalOption", [options]);
}

export async function shutdown(): Promise<string> {
  return rpc<string>("aria2.shutdown");
}

export async function forceShutdown(): Promise<string> {
  return rpc<string>("aria2.forceShutdown");
}
