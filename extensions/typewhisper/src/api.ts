import { getPreferenceValues } from "@raycast/api";
import { readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { ApiError } from "./types";

const DEFAULT_PORT = 8978;
const TIMEOUT_MS = 10000;
// TypeWhisper answers a dictation start only after the model is ready,
// which can include loading a local model.
export const DICTATION_START_TIMEOUT_MS = 5 * 60 * 1000;

export class TypeWhisperError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "TypeWhisperError";
  }
}

interface DiscoveredInstance {
  port: number;
  token?: string;
  writtenAt: number;
}

function appSupportDirectories(): string[] {
  if (process.platform === "win32") {
    const root =
      process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
    // Microsoft Store builds are MSIX packages, so Windows redirects their
    // %LOCALAPPDATA% writes into the package's LocalCache.
    const packageData = (familyName: string) =>
      join(root, "Packages", familyName, "LocalCache", "Local");
    // Current WinUI profiles first, then the folders of older versions.
    return [
      join(root, "TypeWhisper-WinUI"),
      join(root, "TypeWhisper-WinUI-DevUserData"),
      join(root, "TypeWhisper-WinUI-StoreBeta"),
      join(
        packageData("TypeWhisper.TypeWhisper_51tqb5623pxja"),
        "TypeWhisper-WinUI",
      ),
      join(
        packageData("TypeWhisper.TypeWhisperBeta_51tqb5623pxja"),
        "TypeWhisper-WinUI-StoreBeta",
      ),
      ...[
        "TypeWhisper-UserData",
        "TypeWhisper",
        "TypeWhisper-DevUserData",
        "TypeWhisper-Dev",
      ].map((name) => join(root, name)),
    ];
  }

  const root = join(homedir(), "Library", "Application Support");
  // The Mac App Store edition is sandboxed and writes into its container.
  const container = (bundleId: string) =>
    join(
      homedir(),
      "Library",
      "Containers",
      bundleId,
      "Data",
      "Library",
      "Application Support",
    );
  return [
    join(root, "TypeWhisper"),
    join(root, "TypeWhisper-Dev"),
    join(container("com.typewhisper.typewhisper-app"), "TypeWhisper"),
    join(container("com.typewhisper.typewhisper-app.dev"), "TypeWhisper-Dev"),
  ];
}

function parsePort(value: unknown): number | null {
  const port = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
}

// TypeWhisper writes api-discovery.json (port and API token) while its API
// server runs. Older versions only write the api-port file.
function readInstance(directory: string): DiscoveredInstance | null {
  try {
    const path = join(directory, "api-discovery.json");
    const document = JSON.parse(readFileSync(path, "utf-8")) as {
      port?: unknown;
      token?: unknown;
    };
    const port = parsePort(document.port);
    if (port) {
      const token =
        typeof document.token === "string" && document.token.trim() !== ""
          ? document.token.trim()
          : undefined;
      return { port, token, writtenAt: statSync(path).mtimeMs };
    }
  } catch {
    // fall back to the legacy port file
  }

  try {
    const path = join(directory, "api-port");
    const port = parsePort(readFileSync(path, "utf-8").trim());
    return port ? { port, writtenAt: statSync(path).mtimeMs } : null;
  } catch {
    return null;
  }
}

function discoverInstance(): DiscoveredInstance {
  const instances = appSupportDirectories()
    .map(readInstance)
    .filter((instance): instance is DiscoveredInstance => instance !== null)
    // A crashed app can leave its files behind. The newest file belongs to
    // the instance that started its API server last.
    .sort((a, b) => b.writtenAt - a.writtenAt);

  const prefs = getPreferenceValues<Preferences>();
  const overridePort = prefs.port ? parsePort(prefs.port.trim()) : null;
  if (overridePort) {
    const match = instances.find((instance) => instance.port === overridePort);
    return { port: overridePort, token: match?.token, writtenAt: 0 };
  }

  return instances[0] ?? { port: DEFAULT_PORT, writtenAt: 0 };
}

export function getBaseUrl(): string {
  return `http://127.0.0.1:${discoverInstance().port}`;
}

export function getAuthHeaders(): Record<string, string> {
  const { token } = discoverInstance();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Shared by fetchJson and the useFetch views, so both show the same errors.
export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    throw new TypeWhisperError(
      getAuthHeaders().Authorization
        ? "TypeWhisper rejected the API token. Restart TypeWhisper and try again."
        : "TypeWhisper requires an API token, but none was found. Update and restart TypeWhisper, then try again.",
      401,
    );
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const errorBody = (await response.json()) as ApiError;
      message = errorBody.error?.message || message;
    } catch {
      // ignore parse errors
    }
    throw new TypeWhisperError(message, response.status);
  }

  return (await response.json()) as T;
}

async function fetchJson<T>(
  url: URL,
  init: RequestInit,
  timeoutMessage: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url.toString(), init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new TypeWhisperError(timeoutMessage);
    }
    throw new TypeWhisperError(
      "Cannot connect to TypeWhisper. Make sure the app is running and the API server is enabled in Settings > Advanced.",
    );
  }

  return parseApiResponse<T>(response);
}

interface RequestOptions {
  params?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  timeoutMessage?: string;
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = new URL(path, baseUrl);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value);
    }
  }

  const hasBody = options.body !== undefined;
  return fetchJson<T>(
    url,
    {
      method,
      headers: {
        ...getAuthHeaders(),
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
    },
    options.timeoutMessage ?? "Request timed out. Is TypeWhisper running?",
  );
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  return request<T>("GET", path, { params });
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  options: Omit<RequestOptions, "body"> = {},
): Promise<T> {
  return request<T>("POST", path, { ...options, body });
}

export async function apiPut<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  return request<T>("PUT", path, { params });
}

export async function apiPutJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>("PUT", path, { body });
}

export async function apiDelete<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  return request<T>("DELETE", path, { params });
}

export async function apiDeleteJson<T>(
  path: string,
  body: unknown,
): Promise<T> {
  return request<T>("DELETE", path, { body });
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof TypeWhisperError ? error.message : fallback;
}

export async function apiPostMultipart<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = new URL(path, baseUrl);

  return fetchJson<T>(
    url,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
      signal: AbortSignal.timeout(60000),
    },
    "Transcription timed out.",
  );
}
