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

interface WindowsProcessRecord {
  ProcessId?: number;
  Name?: string | null;
  ExecutablePath?: string | null;
  CommandLine?: string | null;
}

export type AntigravityProbeSource = "GetUserStatus" | "GetCommandModelConfigs";

export interface AntigravityProbeResult {
  source: AntigravityProbeSource;
  payload: unknown;
  quotaSummaryPayload?: unknown;
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

type AntigravityProcessSource = "app" | "cli_fallback";

interface AntigravityProcessCandidate {
  processInfo: DetectedProcessInfo;
  source: AntigravityProcessSource;
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

    let quotaSummaryPayload: unknown = null;
    try {
      quotaSummaryPayload = await requestWithFallback(
        {
          path: "/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary",
          body: defaultRequestBody(),
        },
        context,
      );
    } catch {
      // Ignore errors for older daemon versions
    }

    return {
      source: "GetUserStatus",
      payload,
      quotaSummaryPayload,
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
    const parsed =
      process.platform === "win32"
        ? await detectProcessInfoOnWindows(timeoutMs)
        : await detectProcessInfoOnMac(timeoutMs);

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

async function detectProcessInfoOnMac(timeoutMs: number): Promise<ParseProcessInfoResult> {
  const { stdout } = await execFileAsync("/bin/ps", ["-ax", "-o", "pid=,command="], {
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
  });

  return parseProcessInfoFromPsOutput(stdout);
}

async function detectProcessInfoOnWindows(timeoutMs: number): Promise<ParseProcessInfoResult> {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$ErrorActionPreference='Stop'; Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'language_server_windows*' -or $_.Name -like 'agy*' -or $_.CommandLine -match 'language_server_windows|antigravity|antigravity-cli|(^|[\\\\/\\s])agy(\\.exe)?($|\\s)|csrf_token' } | Select-Object ProcessId,Name,ExecutablePath,CommandLine | ConvertTo-Json -Compress",
    ],
    {
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
    },
  );

  return parseProcessInfoFromWindowsProcessList(parseWindowsProcessListJson(stdout));
}

export function parseProcessInfoFromPsOutput(output: string): ParseProcessInfoResult {
  const lines = output.split("\n");
  let sawAntigravityProcess = false;
  let appProcessInfo: DetectedProcessInfo | null = null;
  let fallbackProcessInfo: DetectedProcessInfo | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\d+)\s+(.*)$/);
    if (!match) continue;

    const pid = Number(match[1]);
    if (!Number.isInteger(pid)) continue;

    const command = match[2];
    const lower = command.toLowerCase();

    if (!isSupportedLanguageServerCommand(lower)) continue;
    if (!isAntigravityCommandLine(lower)) continue;

    sawAntigravityProcess = true;

    const candidate = createAntigravityProcessCandidate(pid, command, lower);
    if (!candidate) continue;

    if (candidate.source === "app" && appProcessInfo === null) {
      appProcessInfo = candidate.processInfo;
    } else if (candidate.source === "cli_fallback" && fallbackProcessInfo === null) {
      fallbackProcessInfo = candidate.processInfo;
    }
  }

  return {
    processInfo: appProcessInfo ?? fallbackProcessInfo,
    sawAntigravityProcess,
  };
}

export function parseWindowsProcessListJson(output: string): WindowsProcessRecord[] {
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }

  const parsed = JSON.parse(trimmed);
  const items = Array.isArray(parsed) ? parsed : [parsed];

  return items.filter((item): item is WindowsProcessRecord => typeof item === "object" && item !== null);
}

export function parseProcessInfoFromWindowsProcessList(processes: WindowsProcessRecord[]): ParseProcessInfoResult {
  let sawAntigravityProcess = false;
  let appProcessInfo: DetectedProcessInfo | null = null;
  let fallbackProcessInfo: DetectedProcessInfo | null = null;

  for (const processRecord of processes) {
    const pid = processRecord.ProcessId;
    if (typeof pid !== "number" || !Number.isInteger(pid)) continue;

    const command =
      processRecord.CommandLine?.trim() || processRecord.ExecutablePath?.trim() || processRecord.Name?.trim() || "";
    const searchText = [processRecord.Name, processRecord.ExecutablePath, processRecord.CommandLine]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ")
      .toLowerCase();

    if (!isSupportedLanguageServerCommand(searchText)) continue;
    if (!isAntigravityCommandLine(searchText)) continue;

    sawAntigravityProcess = true;

    const candidate = createAntigravityProcessCandidate(pid, command, searchText);
    if (!candidate) continue;

    if (candidate.source === "app" && appProcessInfo === null) {
      appProcessInfo = candidate.processInfo;
    } else if (candidate.source === "cli_fallback" && fallbackProcessInfo === null) {
      fallbackProcessInfo = candidate.processInfo;
    }
  }

  return {
    processInfo: appProcessInfo ?? fallbackProcessInfo,
    sawAntigravityProcess,
  };
}

export async function detectListeningPorts(pid: number, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<number[]> {
  if (process.platform === "win32") {
    return detectListeningPortsOnWindows(pid, timeoutMs);
  }

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

async function detectListeningPortsOnWindows(pid: number, timeoutMs: number): Promise<number[]> {
  try {
    const { stdout } = await execFileAsync("netstat.exe", ["-ano", "-p", "tcp"], {
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
    });

    const ports = parseListeningPortsFromNetstatOutput(stdout, pid);
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

export function parseListeningPortsFromNetstatOutput(output: string, pid: number): number[] {
  const ports = new Set<number>();

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const columns = trimmed.split(/\s+/);
    if (columns.length < 5) continue;
    if (columns[0].toUpperCase() !== "TCP") continue;

    const state = columns.at(-2)?.toUpperCase();
    const owningPid = Number(columns.at(-1));
    if (state !== "LISTENING" || owningPid !== pid) continue;

    const port = extractPortFromEndpoint(columns[1]);
    if (port !== null) {
      ports.add(port);
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
        os: antigravityOsName(),
        requestedModelId: "MODEL_UNSPECIFIED",
      },
    },
  };
}

function antigravityOsName(): string {
  if (process.platform === "win32") {
    return "windows";
  }

  return "macos";
}

function createAntigravityProcessCandidate(
  pid: number,
  command: string,
  searchText: string,
): AntigravityProcessCandidate | null {
  const isAppProcess = isAntigravityAppCommandLine(searchText);
  const isCliFallbackProcess = isAntigravityCliFallbackCommandLine(searchText);
  if (!isAppProcess && !isCliFallbackProcess) {
    return null;
  }

  const source: AntigravityProcessSource = isAppProcess ? "app" : "cli_fallback";
  let csrfToken = extractFlag("--csrf_token", command);

  if (!csrfToken) {
    // The app path always exposes a real --csrf_token, so a missing token means
    // this can only be a CLI fallback process. The dummy-token branch below is
    // therefore unreachable unless isCliFallbackProcess is true. Note this leaves
    // `source` as "app" for a command that matches both patterns yet lacks a token;
    // that combination is contrived and harmless (it is still a usable candidate).
    if (!isCliFallbackProcess) {
      return null;
    }

    csrfToken = "cli-dummy-token";
  }

  return {
    processInfo: {
      pid,
      csrfToken,
      extensionPort: extractNumericFlag("--extension_server_port", command),
      command,
    },
    source,
  };
}

function isSupportedLanguageServerCommand(command: string): boolean {
  const lower = command.toLowerCase();
  return (
    lower.includes("language_server_macos") || lower.includes("language_server_windows") || isAgyCliExecutable(command)
  );
}

function isAntigravityCommandLine(command: string): boolean {
  return isAntigravityAppCommandLine(command) || isAntigravityCliFallbackCommandLine(command);
}

function isAntigravityAppCommandLine(command: string): boolean {
  const lower = command.toLowerCase();
  if (lower.includes("--app_data_dir") && lower.includes("antigravity")) return true;
  if (lower.includes("/antigravity/") || lower.includes("\\antigravity\\")) return true;
  return false;
}

function isAntigravityCliFallbackCommandLine(command: string): boolean {
  // The supported app path exposes a language_server_* process with a real CSRF token.
  // The CLI fallback exposes the same local API either from the bare `agy` binary (which
  // omits the flag and accepts the dummy token used here) or from a language_server_*
  // binary installed under an antigravity-cli directory.
  //
  // Both checks look at the *executable* only, never at arguments: an unrelated helper the
  // CLI spawns (e.g. a `git` subprocess running inside a `.../antigravity-cli/scratch/...`
  // directory) has `git` as its executable and antigravity-cli only in its args, so it is
  // no longer misdetected as the language server — which previously caused port detection
  // to fail because that helper holds no listening socket.
  if (isAgyCliExecutable(command)) return true;

  const executable = commandExecutable(command).toLowerCase();
  return executable.includes("/antigravity-cli/") || executable.includes("\\antigravity-cli\\");
}

// Returns the executable portion of a command line: the leading quoted path if the
// command line quotes it (Windows quotes paths, which may contain spaces), otherwise
// the first whitespace-delimited token (a path or bare binary name). Never its arguments.
function commandExecutable(command: string): string {
  const trimmed = command.trim();

  // A leading quoted path — take everything inside the quotes so a path containing
  // spaces (e.g. "C:\Program Files\AGY\agy.exe") is not split apart.
  const quoted = trimmed.match(/^["']([^"']+)["']/);
  if (quoted) return quoted[1];

  return trimmed.split(/\s+/, 1)[0] ?? "";
}

// Matches the `agy` CLI by its executable only — the binary must *be* `agy`, not a
// process that merely mentions "agy" somewhere in its arguments.
function isAgyCliExecutable(command: string): boolean {
  const executable = commandExecutable(command).toLowerCase();
  const basename = executable.split(/[\\/]/).pop() ?? executable;

  return basename === "agy" || basename === "agy.exe";
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

function extractPortFromEndpoint(endpoint: string): number | null {
  const bracketedMatch = endpoint.match(/^\[[^\]]+\]:(\d+)$/);
  if (bracketedMatch?.[1]) {
    const value = Number(bracketedMatch[1]);
    return Number.isInteger(value) ? value : null;
  }

  const separatorIndex = endpoint.lastIndexOf(":");
  if (separatorIndex < 0) {
    return null;
  }

  const value = Number(endpoint.slice(separatorIndex + 1));
  return Number.isInteger(value) ? value : null;
}
