import { createHash } from "node:crypto";
import http from "node:http";
import https from "node:https";
import type { ExtensionPreferences, UbusSessionLogin } from "./types";

export const DEFAULT_ROUTER_URL = "http://192.168.1.1";
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const SESSION_REFRESH_BUFFER_MS = 30_000;
const ANONYMOUS_SESSION_ID = "00000000000000000000000000000000";

const TLS_ERROR_CODES = new Set([
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "CERT_HAS_EXPIRED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "ECONNRESET",
  "EPIPE",
  "EAI_AGAIN",
]);

const PRE_DELIVERY_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EADDRNOTAVAIL",
]);

const READ_ONLY_UBUS_METHODS = new Map<string, Set<string>>([
  ["session", new Set(["login"])],
  ["system", new Set(["board", "info"])],
  ["uci", new Set(["get"])],
  ["iwinfo", new Set(["devices", "info", "assoclist", "scan"])],
  ["network.interface", new Set(["dump", "status"])],
  ["network.device", new Set(["status"])],
  ["network.wireless", new Set(["status"])],
  ["rc", new Set(["list"])],
  ["service", new Set(["list"])],
  ["luci", new Set(["getVersion", "getTempInfo", "getCPUUsage", "getInitList", "getConntrackList", "getProcessList"])],
  ["luci-rpc", new Set(["getNetworkDevices", "getDHCPLeases", "getHostHints"])],
  ["luci.upnp", new Set(["get_status"])],
  ["file", new Set(["read", "stat", "list"])],
]);

const READ_ONLY_EXEC_COMMANDS = new Set(["/bin/ping", "/usr/bin/nslookup", "/sbin/logread", "/usr/bin/wg"]);

/** Returns true only for known read-only ubus RPCs safe to replay across cached redirect fallbacks. */
export function isReadOnlyUbusCall(object: string, method: string, args?: Record<string, unknown>): boolean {
  if (object === "file" && method === "exec") {
    return typeof args?.command === "string" && READ_ONLY_EXEC_COMMANDS.has(args.command);
  }
  return READ_ONLY_UBUS_METHODS.get(object)?.has(method) ?? false;
}

export type OpenWrtErrorCode =
  | "INVALID_URL"
  | "AUTH_FAILED"
  | "CONNECTION_FAILED"
  | "TLS_ERROR"
  | "TIMEOUT"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "RPC_ERROR"
  | "EXEC_UNAVAILABLE";

export class OpenWrtError extends Error {
  readonly code: OpenWrtErrorCode;
  readonly preDelivery: boolean;

  constructor(code: OpenWrtErrorCode, message: string, preDelivery = false) {
    super(message);
    this.name = "OpenWrtError";
    this.code = code;
    this.preDelivery = preDelivery;
  }
}

interface JsonRpcSuccessResponse {
  jsonrpc: string;
  id?: number | string | null;
  result?: unknown[];
  error?: {
    code: number;
    message?: string;
    data?: unknown;
  };
}

export interface UbusCallSpec {
  object: string;
  method: string;
  args?: Record<string, unknown>;
}

export type UbusBatchItemResult<T = unknown> =
  { ok: true; data: T } | { ok: false; statusCode: number; message: string };

interface CachedSession {
  key: string;
  sessionId: string;
  createdAt: number;
  expiresAt: number;
  refreshBufferMs: number;
}

let rpcIdCounter = 0;
let sessionEpoch = 0;
let cachedSession: CachedSession | null = null;
let inFlightLogin: { key: string; promise: Promise<string> } | null = null;
const resolvedUbusUrlCache = new Map<string, string>();

function isJsonRpcObject(value: unknown): value is JsonRpcSuccessResponse {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nextRpcId(): number {
  rpcIdCounter += 1;
  return rpcIdCounter;
}

/** Normalizes the user-configured router URL into `{ baseUrl, ubusUrl }`. */
export function normalizeRouterUrl(rawUrl?: string): { baseUrl: string; ubusUrl: string } {
  let trimmed = rawUrl?.trim() || DEFAULT_ROUTER_URL;
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
    trimmed = `http://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new OpenWrtError(
      "INVALID_URL",
      `Invalid Router URL "${rawUrl}". Enter an address such as http://192.168.1.1.`,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new OpenWrtError(
      "INVALID_URL",
      `Unsupported Router URL protocol "${parsed.protocol}". Use http:// or https://.`,
    );
  }

  let pathname = parsed.pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/ubus")) {
    pathname = pathname.slice(0, -"/ubus".length);
  }

  const baseUrl = `${parsed.origin}${pathname}`;
  return {
    baseUrl,
    ubusUrl: `${baseUrl}/ubus`,
  };
}

function getSessionCacheKey(baseUrl: string, username: string, password: string): string {
  const passwordHash = createHash("sha256").update(password).digest("hex");
  return `${baseUrl}\0${username}\0${passwordHash}`;
}

/** Clears cached ubus sessions and resolved redirect URLs. */
export function clearSessionCache(): void {
  sessionEpoch += 1;
  cachedSession = null;
  inFlightLogin = null;
  resolvedUbusUrlCache.clear();
}

/** Maps a ubus numeric status code to a readable message. */
export function getUbusStatusMessage(code: number): string {
  switch (code) {
    case 0:
      return "Success";
    case 1:
      return "Invalid command";
    case 2:
      return "Invalid argument";
    case 3:
      return "Method not found";
    case 4:
      return "Object not found";
    case 5:
      return "No data available";
    case 6:
      return "Permission denied";
    case 7:
      return "Request timed out";
    case 8:
      return "Not supported";
    case 9:
      return "Unknown ubus error";
    case 10:
      return "Connection failed";
    default:
      return `ubus error code ${code}`;
  }
}

function throwForUbusStatus(code: number, object: string, method: string): never {
  if (code === 6) {
    throw new OpenWrtError("PERMISSION_DENIED", `Permission denied calling ${object}.${method} (ubus status 6).`);
  }
  if (code === 3 || code === 4) {
    throw new OpenWrtError("NOT_FOUND", `ubus ${object}.${method} is not available on this router.`);
  }
  if (code === 7) {
    throw new OpenWrtError("TIMEOUT", `Router timed out executing ${object}.${method}.`);
  }
  throw new OpenWrtError("RPC_ERROR", `${object}.${method} failed: ${getUbusStatusMessage(code)}.`);
}

function isOptionalMissingCode(code: number): boolean {
  return code === 3 || code === 4 || code === 5 || code === 6 || code === 8;
}

export function createAbortError(signal?: AbortSignal): Error {
  const reason = signal?.reason;
  if (reason instanceof Error && reason.name === "AbortError") {
    return reason;
  }
  const err = new Error(reason instanceof Error ? reason.message : "Request aborted");
  err.name = "AbortError";
  return err;
}

function raceWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }
  if (signal.aborted) {
    return Promise.reject(createAbortError(signal));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(createAbortError(signal));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

async function postJsonOnce(
  targetUrl: string,
  bodyText: string,
  allowInsecureTls: boolean,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<{ statusCode: number; location?: string; body: string }> {
  const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

  if (signal?.aborted) {
    throw createAbortError(signal);
  }

  const parsed = new URL(targetUrl);
  const isHttps = parsed.protocol === "https:";
  const transport = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    let settled = false;
    let socketConnected = false;

    const finishError = (err: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(err);
    };

    const req = transport.request(
      parsed,
      {
        method: "POST",
        agent: false,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Connection: "close",
          "Content-Length": Buffer.byteLength(bodyText, "utf8"),
        },
        ...(isHttps ? { rejectUnauthorized: !allowInsecureTls } : {}),
      },
      (res) => {
        const chunks: Buffer[] = [];
        let totalBytes = 0;
        res.on("data", (chunk: Buffer | string) => {
          if (settled) {
            return;
          }
          const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
          totalBytes += buf.length;
          if (totalBytes > MAX_RESPONSE_BYTES) {
            finishError(
              new OpenWrtError("RPC_ERROR", `Response from ${parsed.host} exceeded ${MAX_RESPONSE_BYTES} bytes.`),
            );
            req.destroy();
            return;
          }
          chunks.push(buf);
        });
        res.on("end", () => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          const locationHeader = res.headers.location;
          resolve({
            statusCode: res.statusCode ?? 0,
            location: Array.isArray(locationHeader) ? locationHeader[0] : locationHeader,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
        res.on("close", () => {
          if (!settled && !res.complete) {
            finishError(
              new OpenWrtError(
                "CONNECTION_FAILED",
                `Connection to ${parsed.host} closed before the ubus response completed.`,
              ),
            );
          }
        });
        res.on("error", (err) => {
          finishError(classifyTransportError(err, targetUrl, socketConnected));
        });
      },
    );

    req.on("socket", (socket) => {
      if (!socket.connecting) {
        socketConnected = true;
      }
      socket.once("connect", () => {
        socketConnected = true;
      });
    });

    const onAbort = () => {
      finishError(createAbortError(signal));
      req.destroy();
    };

    const timer = setTimeout(() => {
      finishError(new OpenWrtError("TIMEOUT", `Request to ${parsed.host} timed out after ${timeoutMs}ms.`));
      req.destroy();
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort, { once: true });

    req.on("error", (err) => {
      if (signal?.aborted) {
        finishError(createAbortError(signal));
        return;
      }
      if (err instanceof OpenWrtError) {
        finishError(err);
        return;
      }
      finishError(classifyTransportError(err, targetUrl, socketConnected));
    });

    try {
      req.write(bodyText);
      req.end();
    } catch (err) {
      finishError(classifyTransportError(err, targetUrl, socketConnected));
      req.destroy();
    }
  });
}

function classifyTransportError(err: unknown, targetUrl: string, socketConnected = false): OpenWrtError {
  if (err instanceof OpenWrtError) {
    return err;
  }

  const nodeErr = err as NodeJS.ErrnoException;
  const code = nodeErr?.code ?? "";
  const message = nodeErr?.message ?? String(err);

  if (code === "ERR_SSL_WRONG_VERSION_NUMBER" || /wrong version number/i.test(message)) {
    return new OpenWrtError(
      "TLS_ERROR",
      `TLS handshake failed for ${targetUrl} (wrong SSL/TLS version). Check whether your router URL should use http:// instead of https://.`,
    );
  }

  if (TLS_ERROR_CODES.has(code) || /self[- ]signed|certificate|ssl|tls/i.test(message)) {
    return new OpenWrtError(
      "TLS_ERROR",
      `TLS verification failed for ${targetUrl}. Enable "Accept self-signed router TLS certificates" in Extension Preferences if your router uses uhttpd's default certificate.`,
    );
  }

  const preDelivery = !socketConnected && PRE_DELIVERY_ERROR_CODES.has(code);

  if (CONNECTION_ERROR_CODES.has(code) || code === "ETIMEDOUT") {
    return new OpenWrtError(
      "CONNECTION_FAILED",
      `Could not reach OpenWrt router at ${targetUrl} (${code || message}). Check the Router URL and LAN connection.`,
      preDelivery,
    );
  }

  return new OpenWrtError("CONNECTION_FAILED", `Router request to ${targetUrl} failed: ${message}`, preDelivery);
}

async function postUbusPayload(
  baseUrl: string,
  defaultUbusUrl: string,
  payload: unknown,
  allowInsecureTls: boolean,
  timeoutMs: number,
  signal?: AbortSignal,
  allowRetryAfterUncertainError = false,
): Promise<unknown> {
  const bodyText = JSON.stringify(payload);
  const deadline = Date.now() + timeoutMs;
  let cachedTarget = resolvedUbusUrlCache.get(baseUrl);
  let currentUrl = cachedTarget ?? defaultUbusUrl;
  let usedCachedFallback = false;
  const visitedUrls = new Set<string>([currentUrl]);

  const tryCachedFallback = (err?: unknown): boolean => {
    if (
      usedCachedFallback ||
      !cachedTarget ||
      currentUrl !== cachedTarget ||
      currentUrl === defaultUbusUrl ||
      signal?.aborted
    ) {
      return false;
    }
    const canRetry =
      allowRetryAfterUncertainError === true || (err instanceof OpenWrtError && err.preDelivery === true);
    if (!canRetry) {
      return false;
    }
    usedCachedFallback = true;
    cachedTarget = undefined;
    resolvedUbusUrlCache.delete(baseUrl);
    currentUrl = defaultUbusUrl;
    visitedUrls.add(defaultUbusUrl);
    return true;
  };

  let redirects = 0;
  while (true) {
    const remainingMs = Math.max(1, deadline - Date.now());
    let response: { statusCode: number; location?: string; body: string };
    try {
      response = await postJsonOnce(currentUrl, bodyText, allowInsecureTls, remainingMs, signal);
    } catch (err) {
      if (tryCachedFallback(err)) {
        continue;
      }
      throw err;
    }

    if (
      response.statusCode === 301 ||
      response.statusCode === 302 ||
      response.statusCode === 307 ||
      response.statusCode === 308
    ) {
      if (!response.location) {
        throw new OpenWrtError(
          "RPC_ERROR",
          `Router at ${currentUrl} returned HTTP ${response.statusCode} redirect without a Location header.`,
        );
      }

      let currentParsed: URL;
      let nextParsed: URL;
      try {
        currentParsed = new URL(currentUrl);
        nextParsed = new URL(response.location, currentParsed);
      } catch {
        throw new OpenWrtError(
          "RPC_ERROR",
          `Router at ${currentUrl} returned an invalid redirect location "${response.location}".`,
        );
      }

      if (nextParsed.protocol !== "http:" && nextParsed.protocol !== "https:") {
        throw new OpenWrtError(
          "RPC_ERROR",
          `Refusing redirect to unsupported protocol "${nextParsed.protocol}" from ${currentUrl}.`,
        );
      }
      if (currentParsed.protocol === "https:" && nextParsed.protocol === "http:") {
        throw new OpenWrtError(
          "RPC_ERROR",
          `Refusing insecure HTTPS-to-HTTP redirect from ${currentUrl} to ${nextParsed.toString()}.`,
        );
      }
      if (nextParsed.hostname.toLowerCase() !== currentParsed.hostname.toLowerCase()) {
        throw new OpenWrtError(
          "RPC_ERROR",
          `Refusing cross-host redirect from ${currentParsed.hostname} to ${nextParsed.hostname}.`,
        );
      }
      if (!nextParsed.pathname.endsWith("/ubus")) {
        throw new OpenWrtError(
          "RPC_ERROR",
          `Refusing redirect to non-ubus path "${nextParsed.pathname}" from ${currentUrl}.`,
        );
      }

      const nextUrl = nextParsed.toString();
      if (visitedUrls.has(nextUrl)) {
        throw new OpenWrtError(
          "RPC_ERROR",
          `Redirect loop detected while connecting to ${defaultUbusUrl} (${nextUrl}).`,
        );
      }
      if (redirects >= MAX_REDIRECTS) {
        throw new OpenWrtError("RPC_ERROR", `Too many HTTP redirects while connecting to ${defaultUbusUrl}.`);
      }

      visitedUrls.add(nextUrl);
      redirects += 1;
      currentUrl = nextUrl;
      continue;
    }

    if (response.statusCode === 303) {
      throw new OpenWrtError(
        "RPC_ERROR",
        `Router at ${currentUrl} returned unsupported HTTP 303 redirect for ubus POST.`,
      );
    }

    if (response.statusCode === 404) {
      if (tryCachedFallback()) {
        continue;
      }
      throw new OpenWrtError(
        "NOT_FOUND",
        `ubus endpoint not found at ${currentUrl} (HTTP 404). Ensure uhttpd-mod-ubus and rpcd are installed on the router.`,
      );
    }

    if (response.statusCode >= 500 && response.statusCode < 600) {
      if (tryCachedFallback()) {
        continue;
      }
      throw new OpenWrtError(
        "RPC_ERROR",
        `Router at ${currentUrl} returned HTTP ${response.statusCode}${response.body ? `: ${response.body.slice(0, 160)}` : ""}.`,
      );
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new OpenWrtError(
        "RPC_ERROR",
        `Router at ${currentUrl} returned HTTP ${response.statusCode}${response.body ? `: ${response.body.slice(0, 160)}` : ""}.`,
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(response.body) as unknown;
    } catch {
      if (tryCachedFallback()) {
        continue;
      }
      throw new OpenWrtError(
        "RPC_ERROR",
        `Router at ${currentUrl} returned invalid JSON instead of a ubus RPC response.`,
      );
    }

    if (currentUrl !== defaultUbusUrl) {
      resolvedUbusUrlCache.set(baseUrl, currentUrl);
    }
    return parsedBody;
  }
}

function getAuthSettings(prefs?: Partial<ExtensionPreferences>): {
  baseUrl: string;
  ubusUrl: string;
  username: string;
  password: string;
  allowInsecureTls: boolean;
} {
  const { baseUrl, ubusUrl } = normalizeRouterUrl(prefs?.routerUrl);
  const username = prefs?.username?.trim() || "root";
  const password = prefs?.password ?? "";
  const allowInsecureTls = prefs?.allowInsecureTls !== false;

  return { baseUrl, ubusUrl, username, password, allowInsecureTls };
}

async function loginToRouter(
  prefs: Partial<ExtensionPreferences>,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<string> {
  if (signal?.aborted) {
    throw createAbortError(signal);
  }

  const { baseUrl, ubusUrl, username, password, allowInsecureTls } = getAuthSettings(prefs);
  const key = getSessionCacheKey(baseUrl, username, password);

  if (
    cachedSession &&
    cachedSession.key === key &&
    Date.now() < cachedSession.expiresAt - cachedSession.refreshBufferMs
  ) {
    return cachedSession.sessionId;
  }

  if (inFlightLogin && inFlightLogin.key === key) {
    return raceWithAbort(inFlightLogin.promise, signal);
  }

  const epoch = sessionEpoch;
  let loginPromise: Promise<string> | null = null;
  loginPromise = (async () => {
    const requestPayload = {
      jsonrpc: "2.0",
      id: nextRpcId(),
      method: "call",
      params: [
        ANONYMOUS_SESSION_ID,
        "session",
        "login",
        {
          username,
          password,
        },
      ],
    };

    const raw = await postUbusPayload(
      baseUrl,
      ubusUrl,
      requestPayload,
      allowInsecureTls,
      timeoutMs,
      undefined,
      isReadOnlyUbusCall("session", "login"),
    );
    if (!isJsonRpcObject(raw)) {
      throw new OpenWrtError("RPC_ERROR", `Unexpected non-object ubus login response from ${baseUrl}.`);
    }

    if (raw.error) {
      if (raw.error.code === -32002) {
        throw new OpenWrtError(
          "AUTH_FAILED",
          `Authentication failed for "${username}" on ${baseUrl}. Check Username and Password in Extension Preferences.`,
        );
      }
      throw new OpenWrtError("RPC_ERROR", raw.error.message || `ubus login failed (code ${raw.error.code}).`);
    }

    const result = raw.result;
    if (!Array.isArray(result) || typeof result[0] !== "number") {
      throw new OpenWrtError("RPC_ERROR", `Unexpected ubus login response from ${baseUrl}.`);
    }

    const statusCode = result[0];
    if (statusCode !== 0) {
      if (statusCode === 6) {
        throw new OpenWrtError(
          "AUTH_FAILED",
          `Invalid username or password for "${username}" on ${baseUrl}. Check Extension Preferences.`,
        );
      }
      throw new OpenWrtError("AUTH_FAILED", `Router rejected login: ${getUbusStatusMessage(statusCode)}.`);
    }

    const loginData = result[1] as Partial<UbusSessionLogin> | undefined;
    const sessionId = loginData?.ubus_rpc_session;
    if (!sessionId) {
      throw new OpenWrtError("AUTH_FAILED", "Router login succeeded without returning a ubus session ID.");
    }

    const now = Date.now();
    const timeoutSeconds = typeof loginData?.timeout === "number" && loginData.timeout > 0 ? loginData.timeout : 300;
    const refreshBufferMs = Math.min(SESSION_REFRESH_BUFFER_MS, Math.floor((timeoutSeconds * 1000) / 3));
    if (sessionEpoch === epoch && inFlightLogin?.promise === loginPromise) {
      cachedSession = {
        key,
        sessionId,
        createdAt: now,
        expiresAt: now + timeoutSeconds * 1000,
        refreshBufferMs,
      };
    }

    return sessionId;
  })().finally(() => {
    if (inFlightLogin?.promise === loginPromise) {
      inFlightLogin = null;
    }
  });

  // Prevent an unhandled rejection if the initiating caller aborts and leaves loginPromise running.
  void loginPromise.catch(() => {});

  inFlightLogin = { key, promise: loginPromise };
  return raceWithAbort(loginPromise, signal);
}

function isSessionExpiredResponse(resp: JsonRpcSuccessResponse): boolean {
  return resp.error?.code === -32002;
}

async function executeSingleUbusCall<T>(
  object: string,
  method: string,
  args: Record<string, unknown>,
  prefs: Partial<ExtensionPreferences>,
  optional: boolean,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<T | null> {
  const { baseUrl, ubusUrl, allowInsecureTls } = getAuthSettings(prefs);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const sessionId = await loginToRouter(prefs, signal, timeoutMs);
    const payload = {
      jsonrpc: "2.0",
      id: nextRpcId(),
      method: "call",
      params: [sessionId, object, method, args],
    };

    const raw = await postUbusPayload(
      baseUrl,
      ubusUrl,
      payload,
      allowInsecureTls,
      timeoutMs,
      signal,
      isReadOnlyUbusCall(object, method, args),
    );

    if (!isJsonRpcObject(raw)) {
      if (optional) {
        return null;
      }
      throw new OpenWrtError("RPC_ERROR", `Malformed ubus response from ${object}.${method}.`);
    }

    if (isSessionExpiredResponse(raw)) {
      if (optional && cachedSession?.sessionId === sessionId && Date.now() - cachedSession.createdAt < 5000) {
        return null;
      }
      if (attempt === 0) {
        if (cachedSession?.sessionId === sessionId) {
          cachedSession = null;
        }
        continue;
      }
    }

    if (raw.error) {
      if (raw.error.code === -32002) {
        if (optional) {
          return null;
        }
        throw new OpenWrtError(
          "PERMISSION_DENIED",
          `Access denied calling ${object}.${method}. Check user ACL permissions on the router.`,
        );
      }
      throw new OpenWrtError("RPC_ERROR", raw.error.message || `${object}.${method} error (${raw.error.code}).`);
    }

    const result = raw.result;
    if (!Array.isArray(result) || typeof result[0] !== "number") {
      if (optional) {
        return null;
      }
      throw new OpenWrtError("RPC_ERROR", `Malformed ubus response from ${object}.${method}.`);
    }

    const statusCode = result[0];
    if (statusCode === 0) {
      return (result[1] ?? {}) as T;
    }

    if (optional && isOptionalMissingCode(statusCode)) {
      return null;
    }

    throwForUbusStatus(statusCode, object, method);
  }

  if (optional) {
    return null;
  }
  throw new OpenWrtError("AUTH_FAILED", "Unable to establish an authenticated ubus session.");
}

/** Executes a single ubus JSON-RPC call, handling session auth and automatic renewal. */
export async function ubusCall<T = unknown>(
  object: string,
  method: string,
  args: Record<string, unknown> = {},
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<T> {
  return (await executeSingleUbusCall<T>(object, method, args, prefs, false, signal, timeoutMs)) as T;
}

/** Executes an optional ubus call, returning `null` if the object/method is unavailable on this router. */
export async function ubusCallOptional<T = unknown>(
  object: string,
  method: string,
  args: Record<string, unknown> = {},
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<T | null> {
  return executeSingleUbusCall<T>(object, method, args, prefs, true, signal, timeoutMs);
}

/** Executes multiple ubus calls in a single HTTP JSON-RPC batch request. */
export async function ubusBatch(
  calls: UbusCallSpec[],
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<UbusBatchItemResult[]> {
  if (calls.length === 0) {
    return [];
  }

  const { baseUrl, ubusUrl, allowInsecureTls } = getAuthSettings(prefs);
  const isReadOnlyBatch = calls.every((call) => isReadOnlyUbusCall(call.object, call.method, call.args));

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const sessionId = await loginToRouter(prefs, signal, timeoutMs);
    const ids = calls.map(() => nextRpcId());
    const batchPayload = calls.map((call, idx) => ({
      jsonrpc: "2.0",
      id: ids[idx],
      method: "call",
      params: [sessionId, call.object, call.method, call.args ?? {}],
    }));

    const raw = await postUbusPayload(
      baseUrl,
      ubusUrl,
      batchPayload,
      allowInsecureTls,
      timeoutMs,
      signal,
      isReadOnlyBatch,
    );

    if (!Array.isArray(raw)) {
      const single = isJsonRpcObject(raw) ? raw : null;
      if (single && isSessionExpiredResponse(single) && attempt === 0) {
        if (cachedSession?.sessionId === sessionId) {
          cachedSession = null;
        }
        continue;
      }
      throw new OpenWrtError("RPC_ERROR", single?.error?.message || "Unexpected non-array ubus batch response.");
    }

    const items = raw as unknown[];
    if (
      attempt === 0 &&
      items.length > 0 &&
      items.every((item) => isJsonRpcObject(item) && isSessionExpiredResponse(item))
    ) {
      if (cachedSession?.sessionId === sessionId) {
        cachedSession = null;
      }
      continue;
    }

    const byId = new Map<number | string, JsonRpcSuccessResponse>();
    for (const item of items) {
      if (isJsonRpcObject(item) && item.id !== undefined && item.id !== null) {
        byId.set(item.id, item);
      }
    }

    return ids.map((id, idx): UbusBatchItemResult => {
      const positional = items[idx];
      const item =
        byId.get(id) ??
        (isJsonRpcObject(positional) && (byId.size === 0 || positional.id == null) ? positional : undefined);
      if (!item) {
        return { ok: false, statusCode: -1, message: "Missing response item in ubus batch." };
      }
      if (item.error) {
        const errorCode = typeof item.error.code === "number" ? item.error.code : -1;
        return {
          ok: false,
          statusCode: errorCode,
          message: item.error.message || `JSON-RPC error ${errorCode}`,
        };
      }
      if (!Array.isArray(item.result) || typeof item.result[0] !== "number") {
        return { ok: false, statusCode: -1, message: "Malformed ubus batch result item." };
      }
      const statusCode = item.result[0];
      if (statusCode === 0) {
        return { ok: true, data: item.result[1] ?? {} };
      }
      return {
        ok: false,
        statusCode,
        message: getUbusStatusMessage(statusCode),
      };
    });
  }

  throw new OpenWrtError("AUTH_FAILED", "Unable to establish an authenticated ubus session.");
}

/** Formats user-facing titles and guidance for OpenWrt / ubus errors. */
export function getErrorDescription(error: unknown): { title: string; message: string } {
  if (error instanceof OpenWrtError) {
    switch (error.code) {
      case "INVALID_URL":
        return { title: "Invalid Router URL", message: error.message };
      case "AUTH_FAILED":
        return { title: "Router Login Failed", message: error.message };
      case "TLS_ERROR":
        return { title: "Router TLS Error", message: error.message };
      case "CONNECTION_FAILED":
        return { title: "Router Unreachable", message: error.message };
      case "TIMEOUT":
        return { title: "Router Request Timed Out", message: error.message };
      case "PERMISSION_DENIED":
        return { title: "ubus Permission Denied", message: error.message };
      case "NOT_FOUND":
        return { title: "ubus Endpoint Not Found", message: error.message };
      case "EXEC_UNAVAILABLE":
        return { title: "Router Command Unavailable", message: error.message };
      default:
        return { title: "OpenWrt RPC Error", message: error.message };
    }
  }

  return {
    title: "OpenWrt Error",
    message: error instanceof Error ? error.message : String(error),
  };
}
