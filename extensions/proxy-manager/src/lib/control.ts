import { open } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { appPath, socketPath, tokenPath } from "./preferences";
import type { IntegrationResult } from "./types";

/**
 * ProxyManager's local control socket: a 4-byte big-endian length followed by a
 * UTF-8 JSON envelope, one request per connection. See docs/control-protocol.md.
 */
const MAX_FRAME_BYTES = 256 * 1024;
const READ_TIMEOUT_MS = 10_000;
/** Policy calls can block on ProxyManager's consent sheet, which waits for the user. */
const POLICY_TIMEOUT_MS = 30_000;

export class ProxyManagerError extends Error {
  readonly code: string;
  readonly field?: string;

  constructor(code: string, message: string, field?: string) {
    super(message);
    this.name = "ProxyManagerError";
    this.code = code;
    this.field = field;
  }

  /** One sentence the user can act on, shown under a toast title. */
  get hint(): string {
    switch (this.code) {
      case "not_running":
        return "Open Proxy Manager and try again.";
      case "unauthorized":
        return "Approve Raycast in the Proxy Manager consent sheet, or in Settings → Integration.";
      case "unavailable":
        return "Turn on Settings → Integration → Allow external control.";
      case "timeout":
        return "Proxy Manager is busy or waiting for an approval.";
      case "conflict":
        return "The target list is full or the rule already exists.";
      case "not_found":
        return "Refresh — the item no longer exists.";
      default:
        return this.message;
    }
  }
}

export function isNotRunning(error: unknown): boolean {
  return error instanceof ProxyManagerError && error.code === "not_running";
}

export function isProxyManagerError(error: unknown): error is ProxyManagerError {
  return error instanceof ProxyManagerError;
}

export function errorMessage(error: unknown): string {
  if (isProxyManagerError(error)) return error.hint;
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * The socket path only accepts the same user, so this identity is a label for the
 * consent sheet and a stable key for the stored permission. It is not a
 * cryptographic proof: the token file and the UID check are the real gate.
 */
function identity() {
  return {
    pid: process.pid,
    bundleID: "com.raycast.macos",
    teamID: null,
    requirement: "com.proxymanager.raycast-extension",
    displayName: "Raycast",
    path: "/Applications/Raycast.app",
  };
}

function exchange(payload: Buffer, timeoutMs: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let expected = -1;
    let buffer = Buffer.alloc(0);

    const socket = createConnection({ path: socketPath() });

    function finish(error?: Error, data?: Buffer) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve(data as Buffer);
    }

    const timer = setTimeout(
      () => finish(new ProxyManagerError("timeout", "Proxy Manager did not answer in time.")),
      timeoutMs,
    );

    socket.on("error", (error: NodeJS.ErrnoException) => {
      switch (error.code) {
        case "ENOENT":
        case "ECONNREFUSED":
        case "ECONNRESET":
        case "EPIPE":
          finish(new ProxyManagerError("not_running", "Proxy Manager is not running."));
          break;
        case "EACCES":
        case "EPERM":
          finish(
            new ProxyManagerError(
              "forbidden",
              "Raycast cannot reach Proxy Manager's control socket.",
            ),
          );
          break;
        default:
          finish(new ProxyManagerError("unavailable", error.message));
      }
    });

    socket.on("connect", () => socket.write(payload));

    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (expected < 0 && buffer.length >= 4) {
        expected = buffer.readUInt32BE(0);
        if (expected <= 0 || expected > MAX_FRAME_BYTES) {
          finish(new ProxyManagerError("unavailable", "Proxy Manager sent an invalid reply."));
          return;
        }
      }
      if (expected >= 0 && buffer.length >= 4 + expected) {
        finish(undefined, buffer.subarray(4, 4 + expected));
      }
    });

    socket.on("end", () => {
      finish(new ProxyManagerError("unavailable", "Proxy Manager closed the connection."));
    });
  });
}

async function readToken(): Promise<string> {
  try {
    const token = (await readFile(tokenPath(), "utf8")).trim();
    if (!token) {
      throw new ProxyManagerError("not_running", "Proxy Manager is not running.");
    }
    return token;
  } catch (error) {
    if (isProxyManagerError(error)) throw error;
    throw new ProxyManagerError("not_running", "Proxy Manager is not running.");
  }
}

async function send(
  action: string,
  args: Record<string, unknown>,
  timeoutMs: number,
): Promise<IntegrationResult<Record<string, unknown>>> {
  const envelope = {
    v: 1,
    token: await readToken(),
    identity: identity(),
    request: { v: 1, id: randomUUID(), action, args },
  };

  const body = Buffer.from(JSON.stringify(envelope), "utf8");
  if (body.length > MAX_FRAME_BYTES) {
    throw new ProxyManagerError("bad_request", "That request is too large.");
  }

  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);

  const response = await exchange(Buffer.concat([header, body]), timeoutMs);

  let parsed: { result?: IntegrationResult<Record<string, unknown>> };
  try {
    parsed = JSON.parse(response.toString("utf8"));
  } catch {
    throw new ProxyManagerError(
      "unavailable",
      "Proxy Manager sent a reply Raycast could not read.",
    );
  }

  const result = parsed.result;
  if (!result) {
    throw new ProxyManagerError("unavailable", "Proxy Manager sent an empty reply.");
  }
  if (!result.ok) {
    throw new ProxyManagerError(
      result.error?.code ?? "internal",
      result.error?.message ?? "Proxy Manager refused the request.",
      result.error?.field ?? undefined,
    );
  }
  return result;
}

export async function call<T>(
  action: string,
  args: Record<string, unknown> = {},
  options: { policy?: boolean } = {},
): Promise<T> {
  const result = await send(action, args, options.policy ? POLICY_TIMEOUT_MS : READ_TIMEOUT_MS);
  return result.data as T;
}

export async function launchApp(): Promise<void> {
  try {
    await open(appPath());
  } catch {
    throw new ProxyManagerError(
      "unavailable",
      "Proxy Manager could not be launched. Check the app path in this extension's preferences.",
    );
  }
}
