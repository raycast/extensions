import { LocalStorage, environment } from "@raycast/api";
import { spawn } from "child_process";
import { randomBytes, randomUUID } from "crypto";
import { existsSync } from "fs";
import net from "net";
import { join } from "path";

import {
  SESSION_HELPER_KEY_BYTES,
  SESSION_HELPER_PROTOCOL_VERSION,
  openSessionHelperMessage,
  sealSessionHelperMessage,
  type SessionHelperLockIfExpiredResult,
  type SessionHelperMethod,
  type SessionHelperRequest,
  type SessionHelperResponse,
  type SessionHelperSnapshot,
  sessionHelperSocketPath,
} from "../session-helper/protocol";
import { getRaycastProcessId } from "./raycast-process";

const CONNECT_TIMEOUT_MS = 2_000;
const REQUEST_TIMEOUT_MS = 5_000;
const SPAWN_READY_ATTEMPTS = 10;
const SPAWN_READY_DELAY_MS = 100;
// Raycast's LocalStorage is encrypted and scoped to this extension, so other local processes cannot read the key.
const ENDPOINT_STORAGE_KEY = "sessionHelperEndpoint";

interface HelperEndpoint {
  key: Buffer;
  socketPath: string;
}

let spawnPromise: Promise<HelperEndpoint> | undefined;

function helperScriptPath(): string | undefined {
  const candidates = [
    join(environment.assetsPath, "session-helper.mjs"),
    join(__dirname, "..", "..", "assets", "session-helper.mjs"),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

async function loadEndpoint(): Promise<HelperEndpoint | undefined> {
  const raw = await LocalStorage.getItem<string>(ENDPOINT_STORAGE_KEY);
  if (typeof raw !== "string") {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as { key?: unknown; instanceId?: unknown };
    if (typeof parsed.key !== "string" || typeof parsed.instanceId !== "string") {
      return undefined;
    }

    const key = Buffer.from(parsed.key, "hex");
    if (key.length !== SESSION_HELPER_KEY_BYTES) {
      return undefined;
    }

    return { key, socketPath: sessionHelperSocketPath(parsed.instanceId) };
  } catch {
    return undefined;
  }
}

function connectToHelper(path: string): Promise<net.Socket> {
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

async function invokeOnce<T>(
  endpoint: HelperEndpoint,
  method: SessionHelperMethod,
  params: Record<string, unknown> = {},
): Promise<T> {
  const socket = await connectToHelper(endpoint.socketPath);
  const id = randomUUID();
  const request: SessionHelperRequest = {
    protocolVersion: SESSION_HELPER_PROTOCOL_VERSION,
    id,
    issuedAt: Date.now(),
    method,
    params,
  };

  return new Promise<T>((resolve, reject) => {
    let buffer = "";
    let settled = false;

    const settle = (outcome: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
      socket.destroy();
      outcome();
    };

    const timeout = setTimeout(() => {
      settle(() => reject(new Error(`Session helper timed out after ${REQUEST_TIMEOUT_MS}ms`)));
    }, REQUEST_TIMEOUT_MS);

    const onError = (error: Error) => settle(() => reject(error));
    const onClose = () => settle(() => reject(new Error("Session helper closed the connection")));

    const onData = (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        let response: SessionHelperResponse;
        try {
          // Fails for anything not sealed with our key, e.g. a process squatting on the socket path.
          response = openSessionHelperMessage(endpoint.key, "response", line) as SessionHelperResponse;
        } catch {
          settle(() => reject(new Error("Session helper response failed authentication")));
          return;
        }

        if (response.id !== id) {
          continue;
        }

        settle(() => {
          if (response.ok) {
            resolve(response.result as T);
          } else {
            reject(new Error(response.error.message));
          }
        });
        return;
      }
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
    socket.write(`${sealSessionHelperMessage(endpoint.key, "request", request)}\n`);
  });
}

async function isEndpointReady(endpoint: HelperEndpoint): Promise<boolean> {
  try {
    await invokeOnce(endpoint, "ping");
    return true;
  } catch {
    return false;
  }
}

async function spawnHelper(): Promise<HelperEndpoint> {
  const script = helperScriptPath();
  if (!script) {
    throw new Error("session-helper.mjs is not available");
  }

  const key = randomBytes(SESSION_HELPER_KEY_BYTES);
  const instanceId = randomBytes(16).toString("hex");
  const endpoint: HelperEndpoint = { key, socketPath: sessionHelperSocketPath(instanceId) };

  const child = spawn(process.execPath, [script], {
    detached: true,
    // The key goes over stdin: argv and the environment are visible to other processes of the same user.
    stdio: ["pipe", "ignore", "ignore"],
    env: {
      ...process.env,
      VAULTCAST_SCOPE_PID: String(getRaycastProcessId()),
      VAULTCAST_SOCKET: endpoint.socketPath,
    },
  });
  child.once("error", () => undefined);
  child.stdin.once("error", () => undefined);
  child.stdin.end(`${key.toString("hex")}\n`);
  child.unref();

  await LocalStorage.setItem(ENDPOINT_STORAGE_KEY, JSON.stringify({ key: key.toString("hex"), instanceId }));

  for (let attempt = 0; attempt < SPAWN_READY_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, SPAWN_READY_DELAY_MS));
    if (await isEndpointReady(endpoint)) {
      return endpoint;
    }
  }

  throw new Error("Session helper did not start");
}

async function ensureHelperEndpoint(): Promise<HelperEndpoint> {
  if (spawnPromise) {
    return spawnPromise;
  }

  const stored = await loadEndpoint();
  if (stored && (await isEndpointReady(stored))) {
    return stored;
  }

  spawnPromise ??= spawnHelper().finally(() => {
    spawnPromise = undefined;
  });
  return spawnPromise;
}

async function invokeSessionHelper<T>(method: SessionHelperMethod, params: Record<string, unknown> = {}): Promise<T> {
  return invokeOnce<T>(await ensureHelperEndpoint(), method, params);
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

export async function lockSessionHelper(): Promise<void> {
  await invokeSessionHelper("lock");
}

/** Call only after the user confirmed their presence; returns the snapshot including the released credentials. */
export async function unlockAfterPresenceInSessionHelper(): Promise<SessionHelperSnapshot> {
  return invokeSessionHelper<SessionHelperSnapshot>("unlockAfterPresence");
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
