#!/usr/bin/env node
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { chmodSync, existsSync, unlinkSync } from "fs";
import net from "net";

// Keep the wire format in sync with src/session-helper/protocol.ts.
const PROTOCOL_VERSION = 2;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const CIPHER = "aes-256-gcm";
const REQUEST_MAX_AGE_MS = 30_000;
const PARENT_POLL_MS = 5_000;
const DEFAULT_TIMEOUT_MINUTES = 15;
const MIN_TIMEOUT_MINUTES = 1;
const MAX_TIMEOUT_MINUTES = 1440;

const scopePid = Number.parseInt(process.env.VAULTCAST_SCOPE_PID ?? "", 10);
const socketPath = process.env.VAULTCAST_SOCKET ?? "";
/** @type {Buffer} */
let key;
/** Request IDs seen within REQUEST_MAX_AGE_MS, to reject replayed requests. */
const seenRequestIds = new Map();

/** @type {Map<string, Record<string, string>>} */
const credentialsByAdapter = new Map();
let locked = false;
let lastActivityAt = 0;
let sessionEnabled = true;
let timeoutMinutes = DEFAULT_TIMEOUT_MINUTES;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let expiryTimer;

function parseTimeoutMinutes(raw) {
  const parsed = Number.parseInt(String(raw ?? DEFAULT_TIMEOUT_MINUTES), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_TIMEOUT_MINUTES;
  }
  return Math.min(MAX_TIMEOUT_MINUTES, Math.max(MIN_TIMEOUT_MINUTES, parsed));
}

function timeoutMs() {
  return parseTimeoutMinutes(timeoutMinutes) * 60_000;
}

function cloneCredentials(credentials) {
  return { ...credentials };
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function clearExpiryTimer() {
  if (expiryTimer !== undefined) {
    clearTimeout(expiryTimer);
    expiryTimer = undefined;
  }
}

function isExpired() {
  if (!sessionEnabled || locked || credentialsByAdapter.size === 0 || lastActivityAt === 0) {
    return false;
  }
  return Date.now() - lastActivityAt >= timeoutMs();
}

function lockSession() {
  if (!sessionEnabled || credentialsByAdapter.size === 0 || locked) {
    return false;
  }
  locked = true;
  clearExpiryTimer();
  return true;
}

function lockIfExpired() {
  if (!isExpired()) {
    return { locked, changed: false };
  }
  const changed = lockSession();
  return { locked: true, changed };
}

function scheduleExpiryTimer() {
  clearExpiryTimer();
  if (!sessionEnabled || locked || credentialsByAdapter.size === 0 || lastActivityAt === 0) {
    return;
  }

  const remainingMs = timeoutMs() - (Date.now() - lastActivityAt);
  expiryTimer = setTimeout(() => {
    expiryTimer = undefined;
    lockIfExpired();
  }, Math.max(0, remainingMs));
}

function getSessionState() {
  lockIfExpired();
  if (!sessionEnabled) {
    return "disabled";
  }
  if (credentialsByAdapter.size === 0) {
    return "empty";
  }
  if (locked || isExpired()) {
    return "locked";
  }
  return "active";
}

/** Credentials leave the helper only while the session is active, never while it is locked. */
function snapshotForClient() {
  const active = getSessionState() === "active";
  return {
    credentialsByAdapter: active
      ? Object.fromEntries(
          [...credentialsByAdapter.entries()].map(([adapterId, credentials]) => [
            adapterId,
            cloneCredentials(credentials),
          ]),
        )
      : {},
    rememberedAdapterIds: [...credentialsByAdapter.keys()],
    locked,
    lastActivityAt,
  };
}

function seal(direction, payload) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(CIPHER, key, iv);
  cipher.setAAD(Buffer.from(direction));
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  });
}

/** Throws unless the line was sealed with the key handed over by the extension. */
function open(direction, line) {
  const envelope = JSON.parse(line);
  if (typeof envelope?.iv !== "string" || typeof envelope.tag !== "string" || typeof envelope.data !== "string") {
    throw new Error("Malformed message");
  }
  const decipher = createDecipheriv(CIPHER, key, Buffer.from(envelope.iv, "base64"));
  decipher.setAAD(Buffer.from(direction));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(envelope.data, "base64")), decipher.final()]);
  return JSON.parse(plain.toString("utf8"));
}

/** Rejects stale or replayed requests so a captured sealed request cannot be reused later. */
function isFreshRequest(request) {
  const now = Date.now();
  for (const [id, seenAt] of seenRequestIds) {
    if (now - seenAt > REQUEST_MAX_AGE_MS) {
      seenRequestIds.delete(id);
    }
  }

  if (typeof request.id !== "string" || typeof request.issuedAt !== "number") {
    return false;
  }
  if (Math.abs(now - request.issuedAt) > REQUEST_MAX_AGE_MS || seenRequestIds.has(request.id)) {
    return false;
  }
  seenRequestIds.set(request.id, now);
  return true;
}

function emit(socket, payload) {
  socket.write(`${seal("response", payload)}\n`);
}

function respond(socket, id, result) {
  emit(socket, { ok: true, id, result });
}

function respondError(socket, id, message) {
  emit(socket, { ok: false, id, error: { message } });
}

function handleRequest(socket, request) {
  const id = typeof request.id === "string" ? request.id : "0";
  const method = request.method;
  const params = request.params && typeof request.params === "object" ? request.params : {};

  if (request.protocolVersion !== PROTOCOL_VERSION) {
    respondError(socket, id, "Unsupported protocol version");
    return;
  }

  if (!isFreshRequest(request)) {
    respondError(socket, id, "Stale or replayed request");
    return;
  }

  switch (method) {
    case "ping":
      respond(socket, id, { ok: true });
      return;
    case "getSnapshot": {
      sessionEnabled = params.enabled !== false;
      if (params.timeoutMinutes !== undefined) {
        timeoutMinutes = parseTimeoutMinutes(params.timeoutMinutes);
      }
      respond(socket, id, snapshotForClient());
      return;
    }
    case "remember": {
      sessionEnabled = params.enabled !== false;
      if (params.timeoutMinutes !== undefined) {
        timeoutMinutes = parseTimeoutMinutes(params.timeoutMinutes);
      }
      if (!sessionEnabled) {
        respond(socket, id, { ok: true });
        return;
      }
      const adapterId = String(params.adapterId ?? "");
      const credentials = params.credentials && typeof params.credentials === "object" ? params.credentials : {};
      const normalized = {};
      for (const [key, value] of Object.entries(credentials)) {
        if (typeof value === "string") {
          normalized[key] = value;
        }
      }
      credentialsByAdapter.set(adapterId, normalized);
      locked = false;
      lastActivityAt = Date.now();
      scheduleExpiryTimer();
      respond(socket, id, { ok: true });
      return;
    }
    case "peek": {
      const adapterId = String(params.adapterId ?? "");
      if (getSessionState() !== "active") {
        respond(socket, id, {});
        return;
      }
      const stored = credentialsByAdapter.get(adapterId);
      respond(socket, id, stored ? { credentials: cloneCredentials(stored) } : {});
      return;
    }
    case "hasRemembered": {
      const adapterId = String(params.adapterId ?? "");
      respond(socket, id, { value: credentialsByAdapter.has(adapterId) });
      return;
    }
    case "lock": {
      lockSession();
      respond(socket, id, { ok: true });
      return;
    }
    case "unlockAfterPresence": {
      // Only an authenticated client can reach this; the extension calls it after Touch ID / device auth succeeded.
      if (credentialsByAdapter.size > 0) {
        locked = false;
        lastActivityAt = Date.now();
        scheduleExpiryTimer();
      }
      respond(socket, id, snapshotForClient());
      return;
    }
    case "clear": {
      const adapterId = typeof params.adapterId === "string" ? params.adapterId : undefined;
      if (adapterId) {
        credentialsByAdapter.delete(adapterId);
      } else {
        credentialsByAdapter.clear();
      }
      if (credentialsByAdapter.size === 0) {
        locked = false;
        lastActivityAt = 0;
        clearExpiryTimer();
      }
      respond(socket, id, { ok: true });
      return;
    }
    case "markActivity": {
      sessionEnabled = params.enabled !== false;
      if (params.timeoutMinutes !== undefined) {
        timeoutMinutes = parseTimeoutMinutes(params.timeoutMinutes);
      }
      lockIfExpired();
      if (!sessionEnabled || locked || credentialsByAdapter.size === 0) {
        respond(socket, id, { ok: true });
        return;
      }
      lastActivityAt = Date.now();
      scheduleExpiryTimer();
      respond(socket, id, { ok: true });
      return;
    }
    case "lockIfExpired": {
      sessionEnabled = params.enabled !== false;
      if (params.timeoutMinutes !== undefined) {
        timeoutMinutes = parseTimeoutMinutes(params.timeoutMinutes);
      }
      const result = lockIfExpired();
      respond(socket, id, result);
      return;
    }
    default:
      respondError(socket, id, `Unknown method: ${String(method)}`);
  }
}

function cleanupSocketFile() {
  if (process.platform === "win32") {
    return;
  }

  try {
    if (existsSync(socketPath)) {
      unlinkSync(socketPath);
    }
  } catch {
    // Ignore cleanup failures.
  }
}

function shutdown() {
  clearExpiryTimer();
  credentialsByAdapter.clear();
  locked = false;
  lastActivityAt = 0;
  cleanupSocketFile();
  process.exit(0);
}

if (!Number.isFinite(scopePid) || scopePid <= 0 || !socketPath) {
  process.stderr.write("VAULTCAST_SCOPE_PID and VAULTCAST_SOCKET are required\n");
  process.exit(1);
}

async function readKeyFromStdin() {
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk.toString();
  }
  return Buffer.from(raw.trim(), "hex");
}

key = await readKeyFromStdin();
if (key.length !== KEY_BYTES) {
  process.stderr.write("A session key is required on stdin\n");
  process.exit(1);
}

const server = net.createServer((socket) => {
  let buffer = "";

  socket.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      let request;
      try {
        request = open("request", line);
      } catch {
        // Not sealed with our key: the peer is not the extension. Answer nothing and drop it.
        socket.destroy();
        return;
      }

      try {
        handleRequest(socket, request);
      } catch (error) {
        respondError(socket, typeof request?.id === "string" ? request.id : "0", error instanceof Error ? error.message : String(error));
      }
    }
  });
});

server.on("error", (error) => {
  if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
    process.exit(0);
  }
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

if (process.platform !== "win32") {
  cleanupSocketFile();
}

server.listen(socketPath, () => {
  if (process.platform !== "win32") {
    try {
      chmodSync(socketPath, 0o600);
    } catch {
      // Best-effort permissions.
    }
  }
});

setInterval(() => {
  if (!isProcessAlive(scopePid)) {
    shutdown();
  }
}, PARENT_POLL_MS);

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
