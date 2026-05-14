import { getPreferenceValues } from "@raycast/api";
import { readFileSync } from "fs";
import { join } from "path";
import type { ApiError } from "./types";

const DEFAULT_PORT = 8978;
const TIMEOUT_MS = 10000;

export class TypeWhisperError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "TypeWhisperError";
  }
}

function readPortFile(dirName: string): number | null {
  try {
    const home = process.env.HOME || "";
    const portPath = join(
      home,
      "Library",
      "Application Support",
      dirName,
      "api-port",
    );
    const content = readFileSync(portPath, "utf-8").trim();
    const port = parseInt(content, 10);
    return isNaN(port) ? null : port;
  } catch {
    return null;
  }
}

function discoverPort(): number {
  const prefs = getPreferenceValues<Preferences>();
  if (prefs.port && prefs.port.trim() !== "") {
    const port = parseInt(prefs.port.trim(), 10);
    if (!isNaN(port)) return port;
  }

  const prodPort = readPortFile("TypeWhisper");
  if (prodPort) return prodPort;

  const devPort = readPortFile("TypeWhisper-Dev");
  if (devPort) return devPort;

  return DEFAULT_PORT;
}

export function getBaseUrl(): string {
  return `http://127.0.0.1:${discoverPort()}`;
}

async function request<T>(
  method: string,
  path: string,
  params?: Record<string, string>,
  body?: unknown,
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = new URL(path, baseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new TypeWhisperError("Request timed out. Is TypeWhisper running?");
    }
    throw new TypeWhisperError(
      "Cannot connect to TypeWhisper. Make sure the app is running and the API server is enabled in Settings > Advanced.",
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

export async function apiGet<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  return request<T>("GET", path, params);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, undefined, body);
}

export async function apiPut<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  return request<T>("PUT", path, params);
}

export async function apiDelete<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  return request<T>("DELETE", path, params);
}

export async function apiPostMultipart<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = new URL(path, baseUrl);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new TypeWhisperError("Transcription timed out.");
    }
    throw new TypeWhisperError(
      "Cannot connect to TypeWhisper. Make sure the app is running and the API server is enabled in Settings > Advanced.",
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
