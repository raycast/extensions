#!/usr/bin/env node
import { chmodSync, existsSync, unlinkSync } from "fs";
import net from "net";
import { tmpdir } from "os";
import { join } from "path";

const PROTOCOL_VERSION = 1;
const PARENT_POLL_MS = 5_000;
const DEFAULT_TIMEOUT_MINUTES = 15;
const MIN_TIMEOUT_MINUTES = 1;
const MAX_TIMEOUT_MINUTES = 1440;

const scopePid = Number.parseInt(process.env.VAULTCAST_SCOPE_PID ?? "", 10);
const socketPath =
  process.env.VAULTCAST_SOCKET ??
  (process.platform === "win32"
    ? `\\\\.\\pipe\\vaultcast-${scopePid}`
    : join(tmpdir(), `vaultcast-helper-${scopePid}.sock`));

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

function snapshotForClient() {
  lockIfExpired();
  return {
    credentialsByAdapter: Object.fromEntries(
      [...credentialsByAdapter.entries()].map(([adapterId, credentials]) => [adapterId, cloneCredentials(credentials)]),
    ),
    locked,
    lastActivityAt,
  };
}

function emit(socket, payload) {
  socket.write(`${JSON.stringify(payload)}\n`);
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
      if (credentialsByAdapter.size === 0) {
        respond(socket, id, { ok: true });
        return;
      }
      locked = false;
      lastActivityAt = Date.now();
      scheduleExpiryTimer();
      respond(socket, id, { ok: true });
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

if (!Number.isFinite(scopePid) || scopePid <= 0) {
  process.stderr.write("VAULTCAST_SCOPE_PID is required\n");
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

      try {
        const request = JSON.parse(line);
        handleRequest(socket, request);
      } catch (error) {
        respondError(socket, "0", error instanceof Error ? error.message : String(error));
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
