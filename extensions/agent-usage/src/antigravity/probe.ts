import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as http from "node:http";
import * as https from "node:https";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const GET_USER_STATUS_PATH = "/exa.language_server_pb.LanguageServerService/GetUserStatus";
const GET_COMMAND_MODEL_CONFIGS_PATH = "/exa.language_server_pb.LanguageServerService/GetCommandModelConfigs";
const GET_UNLEASH_DATA_PATH = "/exa.language_server_pb.LanguageServerService/GetUnleashData";

const DEFAULT_TIMEOUT_MS = 8000;

export type ProbeErrorCode =
  | "not_running"
  | "missing_csrf"
  | "port_detection_failed"
  | "api_error"
  | "network_error"
  | "parse_error";

export class AntigravityProbeError extends Error {
  constructor(
    public readonly code: ProbeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AntigravityProbeError";
  }
}

export interface DetectedProcessInfo {
  pid: number;
  csrfToken: string;
  extensionPort: number | null;
  command: string;
}

export interface ParseProcessInfoResult {
  processInfo: DetectedProcessInfo | null;
  sawAntigravityProcess: boolean;
}

export type AntigravityProbeSource = "GetUserStatus" | "GetCommandModelConfigs";

export interface AntigravityProbeResult {
  source: AntigravityProbeSource;
  payload: unknown;
}

export interface RequestContext {
  httpsPort: number;
  httpPort: number | null;
  csrfToken: string;
  timeoutMs: number;
}

export interface RequestPayload {
  path: string;
  body: Record<string, unknown>;
}

export async function fetchAntigravityRawStatus(
  preferredSource: AntigravityProbeSource = "GetUserStatus",
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<AntigravityProbeResult> {
  const processInfo = await detectProcessInfo(timeoutMs);
  const ports = await detectListeningPorts(processInfo.pid, timeoutMs);
  const connectPort = await findWorkingPort(ports, processInfo.csrfToken, timeoutMs);

  const context: RequestContext = {
    httpsPort: connectPort,
    httpPort: processInfo.extensionPort ?? connectPort,
    csrfToken: processInfo.csrfToken,
    timeoutMs,
  };

  if (preferredSource === "GetCommandModelConfigs") {
    const payload = await requestWithFallback(
      {
        path: GET_COMMAND_MODEL_CONFIGS_PATH,
        body: defaultRequestBody(),
      },
      context,
    );

    return {
      source: "GetCommandModelConfigs",
      payload,
    };
  }

  try {
    const payload = await requestWithFallback(
      {
        path: GET_USER_STATUS_PATH,
        body: defaultRequestBody(),
      },
      context,
    );

    return {
      source: "GetUserStatus",
      payload,
    };
  } catch {
    const payload = await requestWithFallback(
      {
        path: GET_COMMAND_MODEL_CONFIGS_PATH,
        body: defaultRequestBody(),
      },
      context,
    );

    return {
      source: "GetCommandModelConfigs",
      payload,
    };
  }
}

export async function detectProcessInfo(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<DetectedProcessInfo> {
  try {
    const { stdout } = await execFileAsync("/bin/ps", ["-ax", "-o", "pid=,command="], {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
    });

    const parsed = parseProcessInfoFromPsOutput(stdout);

    if (parsed.processInfo) {
      return parsed.processInfo;
    }

    if (parsed.sawAntigravityProcess) {
      throw new AntigravityProbeError("missing_csrf", "Antigravity CSRF token not found");
    }

    throw new AntigravityProbeError("not_running", "Antigravity language server not detected");
  } catch (error) {
    if (error instanceof AntigravityProbeError) {
      throw error;
    }

    throw new AntigravityProbeError("network_error", error instanceof Error ? error.message : "ps command failed");
  }
}

export function parseProcessInfoFromPsOutput(output: string): ParseProcessInfoResult {
  const lines = output.split("\n");
  let sawAntigravityProcess = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\d+)\s+(.*)$/);
    if (!match) continue;

    const pid = Number(match[1]);
    if (!Number.isInteger(pid)) continue;

    const command = match[2];
    const lower = command.toLowerCase();

    if (!lower.includes("language_server_macos")) continue;
    if (!isAntigravityCommandLine(lower)) continue;

    sawAntigravityProcess = true;

    const csrfToken = extractFlag("--csrf_token", command);
    if (!csrfToken) {
      continue;
    }

    const extensionPort = extractNumericFlag("--extension_server_port", command);

    return {
      processInfo: {
        pid,
        csrfToken,
        extensionPort,
        command,
      },
      sawAntigravityProcess,
    };
  }

  return {
    processInfo: null,
    sawAntigravityProcess,
  };
}

export async function detectListeningPorts(pid: number, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<number[]> {
  const lsofPath = ["/usr/sbin/lsof", "/usr/bin/lsof"].find((candidate) => fs.existsSync(candidate));

  if (!lsofPath) {
    throw new AntigravityProbeError("port_detection_failed", "lsof not available");
  }

  try {
    const { stdout } = await execFileAsync(lsofPath, ["-nP", "-iTCP", "-sTCP:LISTEN", "-a", "-p", String(pid)], {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
    });

    const ports = parseListeningPorts(stdout);
    if (ports.length === 0) {
      throw new AntigravityProbeError("port_detection_failed", "no listening ports found");
    }

    return ports;
  } catch (error) {
    if (error instanceof AntigravityProbeError) {
      throw error;
    }

    throw new AntigravityProbeError(
      "port_detection_failed",
      error instanceof Error ? error.message : "failed to inspect listening ports",
    );
  }
}

export function parseListeningPorts(output: string): number[] {
  const regex = /:(\d+)\s+\(LISTEN\)/g;
  const ports = new Set<number>();

  for (const match of output.matchAll(regex)) {
    const value = Number(match[1]);
    if (Number.isInteger(value)) {
      ports.add(value);
    }
  }

  return [...ports].sort((a, b) => a - b);
}

export async function findWorkingPort(
  ports: number[],
  csrfToken: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<number> {
  for (const port of ports) {
    const reachable = await testPortConnectivity(port, csrfToken, timeoutMs);
    if (reachable) {
      return port;
    }
  }

  throw new AntigravityProbeError("port_detection_failed", "no working API port found");
}

async function testPortConnectivity(port: number, csrfToken: string, timeoutMs: number): Promise<boolean> {
  try {
    await sendRequest({
      scheme: "https",
      port,
      payload: {
        path: GET_UNLEASH_DATA_PATH,
        body: unleashRequestBody(),
      },
      csrfToken,
      timeoutMs,
    });

    return true;
  } catch {
    try {
      await sendRequest({
        scheme: "http",
        port,
        payload: {
          path: GET_UNLEASH_DATA_PATH,
          body: unleashRequestBody(),
        },
        csrfToken,
        timeoutMs,
      });

      return true;
    } catch {
      return false;
    }
  }
}

type RequestSender = (options: SendRequestOptions) => Promise<unknown>;

export async function requestWithFallback(
  payload: RequestPayload,
  context: RequestContext,
  requestSender: RequestSender = sendRequest,
): Promise<unknown> {
  let lastError: unknown;

  try {
    return await requestSender({
      scheme: "https",
      port: context.httpsPort,
      payload,
      csrfToken: context.csrfToken,
      timeoutMs: context.timeoutMs,
    });
  } catch (error) {
    lastError = error;
  }

  const httpPorts = context.httpPort !== null ? [context.httpPort] : [];
  if (!httpPorts.includes(context.httpsPort)) {
    httpPorts.push(context.httpsPort);
  }

  for (const port of httpPorts) {
    try {
      return await requestSender({
        scheme: "http",
        port,
        payload,
        csrfToken: context.csrfToken,
        timeoutMs: context.timeoutMs,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

interface SendRequestOptions {
  scheme: "http" | "https";
  port: number;
  payload: RequestPayload;
  csrfToken: string;
  timeoutMs: number;
}

async function sendRequest(options: SendRequestOptions): Promise<unknown> {
  const body = JSON.stringify(options.payload.body);

  return await new Promise<unknown>((resolve, reject) => {
    const transport = options.scheme === "https" ? https : http;

    const req = transport.request(
      {
        host: "127.0.0.1",
        port: options.port,
        path: options.payload.path,
        method: "POST",
        timeout: options.timeoutMs,
        rejectUnauthorized: false,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "Connect-Protocol-Version": "1",
          "X-Codeium-Csrf-Token": options.csrfToken,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on("end", () => {
          const payloadText = Buffer.concat(chunks).toString("utf-8");

          if (!res.statusCode || res.statusCode !== 200) {
            reject(new AntigravityProbeError("api_error", `HTTP ${res.statusCode ?? "unknown"}: ${payloadText}`));
            return;
          }

          try {
            const parsed = JSON.parse(payloadText);
            resolve(parsed);
          } catch {
            reject(new AntigravityProbeError("parse_error", "Invalid JSON from local Antigravity API"));
          }
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new AntigravityProbeError("network_error", "Antigravity request timed out"));
    });

    req.on("error", (error) => {
      if (error instanceof AntigravityProbeError) {
        reject(error);
        return;
      }

      reject(new AntigravityProbeError("network_error", error.message));
    });

    req.write(body);
    req.end();
  });
}

function defaultRequestBody(): Record<string, unknown> {
  return {
    metadata: {
      ideName: "antigravity",
      extensionName: "antigravity",
      ideVersion: "unknown",
      locale: "en",
    },
  };
}

function unleashRequestBody(): Record<string, unknown> {
  return {
    context: {
      properties: {
        devMode: "false",
        extensionVersion: "unknown",
        hasAnthropicModelAccess: "true",
        ide: "antigravity",
        ideVersion: "unknown",
        installationId: "raycast-agent-usage",
        language: "UNSPECIFIED",
        os: "macos",
        requestedModelId: "MODEL_UNSPECIFIED",
      },
    },
  };
}

function isAntigravityCommandLine(command: string): boolean {
  if (command.includes("--app_data_dir") && command.includes("antigravity")) return true;
  if (command.includes("/antigravity/") || command.includes("\\antigravity\\")) return true;
  return false;
}

function extractFlag(flag: string, command: string): string | null {
  const escapedFlag = flag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escapedFlag}[=\\s]+([^\\s]+)`, "i");
  const match = command.match(regex);

  if (!match?.[1]) {
    return null;
  }

  return match[1];
}

function extractNumericFlag(flag: string, command: string): number | null {
  const raw = extractFlag(flag, command);
  if (!raw) return null;

  const value = Number(raw);
  return Number.isInteger(value) ? value : null;
}
