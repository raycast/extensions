import { LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/sdk/types.js";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { assertSupportedVersion } from "./app";
import { startMCPDeeplink } from "./deeplink";
import { RPC_CODE, parseRpcErrorBody } from "./protocol";
import {
  InvalidPortError,
  MCPNotRunningError,
  RateLimitedError,
  ServerUnreachableError,
} from "./types";
import packageJson from "../../package.json";

export const DEFAULT_MCP_PORT = 23508;

const PROBE_TIMEOUT_MS = 2_000;
const START_POLL_INTERVAL_MS = 600;
const START_POLL_ATTEMPTS = 12;
// TablePro 0.67 and later send "TablePro"; 0.37 to 0.66 sent "TablePro MCP".
const TABLEPRO_REALMS = new Set(["TablePro", "TablePro MCP"]);

export const CLIENT_NAME = "raycast-tablepro";
export const CLIENT_VERSION =
  typeof packageJson.version === "string" ? packageJson.version : "0.0.0";

export interface Endpoint {
  port: number;
  mcpUrl: string;
  exchangeUrl: string;
}

export interface VerifiedEndpoint extends Endpoint {
  anonymous: boolean;
}

type ProbeResult =
  | { kind: "tablepro"; anonymous: boolean; version?: string }
  | { kind: "refused" }
  | { kind: "rate-limited" }
  | { kind: "other" };

export function mcpPort(): number {
  const { mcpPort: raw } = getPreferenceValues<Preferences>();
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value === "") return DEFAULT_MCP_PORT;
  if (!/^\d{1,5}$/.test(value)) throw new InvalidPortError(value);
  const port = Number.parseInt(value, 10);
  if (port < 1 || port > 65_535) throw new InvalidPortError(value);
  return port;
}

export function endpoint(): Endpoint {
  const port = mcpPort();
  const base = `http://127.0.0.1:${port}`;
  return {
    port,
    mcpUrl: `${base}/mcp`,
    exchangeUrl: `${base}/v1/integrations/exchange`,
  };
}

function isConnectionRefused(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (
      typeof current === "object" &&
      (current as { code?: unknown }).code === "ECONNREFUSED"
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function hasTableProChallenge(header: string | null): boolean {
  if (!header) return false;
  const match = /^Bearer\b.*\brealm="([^"]*)"/i.exec(header.trim());
  return match !== null && TABLEPRO_REALMS.has(match[1]!);
}

function firstJsonPayload(contentType: string, body: string): unknown {
  if (contentType.includes("text/event-stream")) {
    for (const line of body.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      try {
        return JSON.parse(line.slice(5).trim());
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function serverInfoOf(
  payload: unknown,
): { name?: unknown; version?: unknown } | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const result = (payload as { result?: unknown }).result;
  if (typeof result !== "object" || result === null) return undefined;
  const info = (result as { serverInfo?: unknown }).serverInfo;
  if (typeof info !== "object" || info === null) return undefined;
  return info as { name?: unknown; version?: unknown };
}

function combineSignals(
  ...signals: Array<AbortSignal | undefined>
): AbortSignal {
  const present = signals.filter((s): s is AbortSignal => s !== undefined);
  return present.length === 1 ? present[0]! : AbortSignal.any(present);
}

async function probe(
  target: Endpoint,
  signal?: AbortSignal,
): Promise<ProbeResult> {
  let response: Response;
  try {
    response = await fetch(target.mcpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "probe",
        method: "initialize",
        params: {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: CLIENT_NAME, version: CLIENT_VERSION },
        },
      }),
      redirect: "manual",
      signal: combineSignals(signal, AbortSignal.timeout(PROBE_TIMEOUT_MS)),
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    return isConnectionRefused(err) ? { kind: "refused" } : { kind: "other" };
  }

  if (response.status === 401) {
    await response.body?.cancel().catch(() => undefined);
    return hasTableProChallenge(response.headers.get("www-authenticate"))
      ? { kind: "tablepro", anonymous: false }
      : { kind: "other" };
  }

  const text = await response.text().catch(() => "");
  if (response.status === 429) {
    return parseRpcErrorBody(text)?.code === RPC_CODE.rateLimited
      ? { kind: "rate-limited" }
      : { kind: "other" };
  }
  if (!response.ok) return { kind: "other" };

  const info = serverInfoOf(
    firstJsonPayload(response.headers.get("content-type") ?? "", text),
  );
  if (info?.name !== "tablepro") return { kind: "other" };
  return {
    kind: "tablepro",
    anonymous: true,
    version: typeof info.version === "string" ? info.version : undefined,
  };
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timeout);
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function startAndWait(
  target: Endpoint,
  signal?: AbortSignal,
): Promise<ProbeResult> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting TablePro…",
  }).catch(() => undefined);
  try {
    await startMCPDeeplink();
    for (let attempt = 0; attempt < START_POLL_ATTEMPTS; attempt += 1) {
      await delay(START_POLL_INTERVAL_MS, signal);
      const result = await probe(target, signal);
      if (result.kind !== "refused") {
        if (toast) {
          toast.style =
            result.kind === "tablepro"
              ? Toast.Style.Success
              : Toast.Style.Failure;
          toast.title =
            result.kind === "tablepro"
              ? "TablePro is ready"
              : "Could not reach TablePro";
        }
        return result;
      }
    }
    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not reach TablePro";
    }
    return { kind: "refused" };
  } catch (err) {
    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not start TablePro";
      if (err instanceof Error && err.message) toast.message = err.message;
    }
    throw err;
  }
}

export async function verifiedEndpoint(options: {
  allowAutoStart: boolean;
  signal?: AbortSignal;
}): Promise<VerifiedEndpoint> {
  const target = endpoint();
  let result = await probe(target, options.signal);
  if (result.kind === "refused") {
    if (!options.allowAutoStart) throw new MCPNotRunningError();
    result = await startAndWait(target, options.signal);
  }
  switch (result.kind) {
    case "tablepro":
      assertSupportedVersion(result.version);
      return { ...target, anonymous: result.anonymous };
    case "rate-limited":
      throw new RateLimitedError();
    case "refused":
    case "other":
      throw new ServerUnreachableError(target.port);
  }
}
