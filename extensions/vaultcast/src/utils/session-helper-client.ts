import { environment } from "@raycast/api";
import { spawn } from "child_process";
import { existsSync } from "fs";
import net from "net";
import { join } from "path";

import {
  SESSION_HELPER_PROTOCOL_VERSION,
  type SessionHelperHasRememberedResult,
  type SessionHelperLockIfExpiredResult,
  type SessionHelperMethod,
  type SessionHelperPeekResult,
  type SessionHelperRequest,
  type SessionHelperResponse,
  type SessionHelperSnapshot,
  sessionHelperSocketPath,
} from "../session-helper/protocol";
import { getRaycastProcessId } from "./raycast-process";

const CONNECT_TIMEOUT_MS = 2_000;
const REQUEST_TIMEOUT_MS = 5_000;
const SPAWN_RETRY_COUNT = 3;
const SPAWN_RETRY_DELAY_MS = 150;

let nextRequestId = 1;
let spawnPromise: Promise<void> | undefined;

function helperScriptPath(): string | undefined {
  const candidates = [
    join(environment.assetsPath, "session-helper.mjs"),
    join(__dirname, "..", "..", "assets", "session-helper.mjs"),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

function scopePid(): number {
  return getRaycastProcessId();
}

function socketPath(): string {
  return sessionHelperSocketPath(scopePid());
}

function connectToHelper(): Promise<net.Socket> {
  const path = socketPath();

  return new Promise((resolve, reject) => {
    const socket = net.connect({ path });
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error("Session helper connect timed out"));
      }
    }, CONNECT_TIMEOUT_MS);

    socket.once("connect", () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.once("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function spawnHelper(): Promise<void> {
  if (spawnPromise) {
    return spawnPromise;
  }

  spawnPromise = (async () => {
    const script = helperScriptPath();
    if (!script) {
      throw new Error("session-helper.mjs is not available");
    }

    const pid = scopePid();
    const child = spawn(process.execPath, [script], {
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        VAULTCAST_SCOPE_PID: String(pid),
        VAULTCAST_SOCKET: socketPath(),
      },
    });
    child.unref();
  })().finally(() => {
    spawnPromise = undefined;
  });

  return spawnPromise;
}

async function ensureHelperRunning(): Promise<void> {
  for (let attempt = 0; attempt < SPAWN_RETRY_COUNT; attempt++) {
    try {
      const socket = await connectToHelper();
      socket.destroy();
      return;
    } catch {
      if (attempt === 0) {
        await spawnHelper();
      }
      await new Promise((resolve) => setTimeout(resolve, SPAWN_RETRY_DELAY_MS));
    }
  }

  const socket = await connectToHelper();
  socket.destroy();
}

function invokeOnce<T>(method: SessionHelperMethod, params: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    void (async () => {
      let socket: net.Socket | undefined;

      try {
        socket = await connectToHelper();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      const id = String(nextRequestId++);
      let buffer = "";
      let settled = false;

      const request: SessionHelperRequest = {
        protocolVersion: SESSION_HELPER_PROTOCOL_VERSION,
        id,
        method,
        params,
      };

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          socket?.destroy();
          reject(new Error(`Session helper timed out after ${REQUEST_TIMEOUT_MS}ms`));
        }
      }, REQUEST_TIMEOUT_MS);

      const cleanup = () => {
        clearTimeout(timeout);
        socket?.off("data", onData);
        socket?.off("error", onError);
        socket?.destroy();
      };

      const onError = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      };

      const onData = (chunk: Buffer | string) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          try {
            const response = JSON.parse(line) as SessionHelperResponse;
            if (response.id !== id) {
              continue;
            }

            if (settled) {
              return;
            }
            settled = true;
            cleanup();

            if (!response.ok) {
              reject(new Error(response.error.message));
              return;
            }

            resolve(response.result as T);
          } catch (error) {
            if (settled) {
              return;
            }
            settled = true;
            cleanup();
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        }
      };

      socket.on("data", onData);
      socket.once("error", onError);
      socket.write(`${JSON.stringify(request)}\n`);
    })();
  });
}

export async function invokeSessionHelper<T>(
  method: SessionHelperMethod,
  params: Record<string, unknown> = {},
): Promise<T> {
  await ensureHelperRunning();

  try {
    return await invokeOnce<T>(method, params);
  } catch {
    await ensureHelperRunning();
    return invokeOnce<T>(method, params);
  }
}

export async function pingSessionHelper(): Promise<boolean> {
  try {
    await invokeSessionHelper<{ ok: true }>("ping");
    return true;
  } catch {
    return false;
  }
}

export async function getSessionHelperSnapshot(params: {
  timeoutMinutes: number;
  enabled: boolean;
}): Promise<SessionHelperSnapshot> {
  return invokeSessionHelper<SessionHelperSnapshot>("getSnapshot", params);
}

export async function rememberInSessionHelper(params: {
  adapterId: string;
  credentials: Record<string, string>;
  timeoutMinutes: number;
  enabled: boolean;
}): Promise<void> {
  await invokeSessionHelper("remember", params);
}

export async function peekInSessionHelper(adapterId: string): Promise<Record<string, string> | undefined> {
  const result = await invokeSessionHelper<SessionHelperPeekResult>("peek", { adapterId });
  return result.credentials;
}

export async function hasRememberedInSessionHelper(adapterId: string): Promise<boolean> {
  const result = await invokeSessionHelper<SessionHelperHasRememberedResult>("hasRemembered", { adapterId });
  return result.value;
}

export async function lockSessionHelper(): Promise<void> {
  await invokeSessionHelper("lock");
}

export async function unlockAfterPresenceInSessionHelper(): Promise<void> {
  await invokeSessionHelper("unlockAfterPresence");
}

export async function clearSessionHelper(adapterId?: string): Promise<void> {
  await invokeSessionHelper("clear", adapterId ? { adapterId } : {});
}

export async function markActivityInSessionHelper(params: { timeoutMinutes: number; enabled: boolean }): Promise<void> {
  await invokeSessionHelper("markActivity", params);
}

export async function lockIfExpiredInSessionHelper(params: {
  timeoutMinutes: number;
  enabled: boolean;
}): Promise<SessionHelperLockIfExpiredResult> {
  return invokeSessionHelper<SessionHelperLockIfExpiredResult>("lockIfExpired", params);
}

export function sessionHelperParams(
  timeoutMinutes: number,
  enabled: boolean,
): {
  timeoutMinutes: number;
  enabled: boolean;
} {
  return { timeoutMinutes, enabled };
}
