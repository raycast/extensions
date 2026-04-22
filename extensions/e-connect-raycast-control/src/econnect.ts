import { getPreferenceValues } from "@raycast/api";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

import type {
  AutomationResponse,
  DeviceCommandResponse,
  DeviceConfig,
  ExtensionPreferences,
  SystemStatusResponse,
  TriggerResponse,
} from "./types";

const REQUEST_TIMEOUT_MS = 10000;
const DEFAULT_HTTP_API_PORT = "8000";
const DEFAULT_HTTPS_PORT = "3443";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

type ApiErrorPayload = {
  detail?: string | { message?: string; error?: string };
  message?: string;
  error?: string;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

type ResolvedConnectionSettings = {
  protocol: "http" | "https";
  host: string;
  port: string;
};

function resolveServerAddress(preferences: ExtensionPreferences): ResolvedConnectionSettings {
  const rawAddress = preferences.serverAddress.trim();

  if (!rawAddress) {
    throw new Error("Missing server IP:Port in Raycast preferences.");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawAddress.includes("://") ? rawAddress : `http://${rawAddress}`);
  } catch {
    throw new Error("Invalid Server IP:Port. Use values like 192.168.1.25:8000 or https://192.168.1.25:3443.");
  }
  const protocol = parsed.protocol.replace(":", "");
  if (protocol !== "http" && protocol !== "https") {
    throw new Error("The API connection must use http:// or https://.");
  }

  if (parsed.search || parsed.hash) {
    throw new Error("Enter only the server IP:Port or the API base URL, without query parameters.");
  }

  const normalizedPath = trimTrailingSlash(parsed.pathname);
  if (normalizedPath && normalizedPath !== "/api/v1") {
    throw new Error("Use only Server IP:Port like 192.168.1.25:8000 or the direct API URL ending in /api/v1.");
  }

  return {
    protocol: protocol as "http" | "https",
    host: parsed.hostname,
    port: parsed.port || (protocol === "https" ? DEFAULT_HTTPS_PORT : DEFAULT_HTTP_API_PORT),
  };
}

export function getPreferences() {
  return getPreferenceValues<ExtensionPreferences>();
}

export function getApiBaseUrl(preferences = getPreferences()) {
  const { protocol, host, port } = resolveServerAddress(preferences);
  const url = new URL(`${protocol}://${host}`);
  if (port) {
    url.port = port;
  }
  const baseUrl = trimTrailingSlash(url.toString());
  return `${baseUrl}/api/v1`;
}

export function getWebUiBaseUrl(preferences = getPreferences()) {
  const { host, protocol, port } = resolveServerAddress(preferences);
  const webUiPort = protocol === "https" && port !== DEFAULT_HTTP_API_PORT ? port : DEFAULT_HTTPS_PORT;
  const url = new URL(`https://${host}`);
  if (webUiPort) {
    url.port = webUiPort;
  }
  return trimTrailingSlash(url.toString());
}

function readErrorMessage(statusCode: number, payload: ApiErrorPayload | null, rawBody: string) {
  if (payload) {
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail.trim();
    }
    if (payload.detail && typeof payload.detail === "object") {
      if (typeof payload.detail.message === "string" && payload.detail.message.trim()) {
        return payload.detail.message.trim();
      }
      if (typeof payload.detail.error === "string" && payload.detail.error.trim()) {
        return payload.detail.error.trim();
      }
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
  }

  if (rawBody.trim()) {
    return rawBody.trim();
  }

  if (statusCode === 401) {
    return "Unauthorized. The API key may be invalid, revoked, or created on a different E-Connect server.";
  }

  return `The server returned HTTP ${statusCode}.`;
}

function parseJson<T>(input: string): T | null {
  if (!input.trim()) {
    return null;
  }

  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

function mapNetworkError(error: unknown) {
  if (!(error instanceof Error)) {
    return "The request failed for an unknown reason.";
  }

  const nodeError = error as Error & { code?: string };
  const lowerMessage = error.message.toLowerCase();

  if (
    nodeError.code === "EPROTO" &&
    (lowerMessage.includes("wrong version number") || lowerMessage.includes("ssl3_get_record"))
  ) {
    return "Protocol mismatch. API key traffic uses http://<server>:8000 by default. Enter Server IP:Port like 192.168.1.25:8000, or prefix https:// only if your backend API is exposed over TLS.";
  }

  switch (nodeError.code) {
    case "ECONNREFUSED":
      return "Connection refused. Check the server IP:Port and API key in Raycast preferences.";
    case "ENOTFOUND":
      return "The configured server host could not be resolved.";
    case "ETIMEDOUT":
      return "The request timed out before the E-Connect server responded.";
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "SELF_SIGNED_CERT_IN_CHAIN":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
      return "TLS validation failed. Trust the certificate in macOS or enable the self-signed certificate preference.";
    default:
      return error.message;
  }
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const preferences = getPreferences();
  const apiKey = preferences.apiKey.trim();
  if (!apiKey) {
    throw new Error("Missing API key in Raycast preferences.");
  }
  const apiUrl = new URL(path.replace(/^\//, ""), `${getApiBaseUrl(preferences)}/`);
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  const transport = apiUrl.protocol === "https:" ? https : http;

  return new Promise<T>((resolve, reject) => {
    const request = transport.request(
      apiUrl,
      {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(apiUrl.protocol === "https:" ? { rejectUnauthorized: !preferences.allowInsecureTls } : {}),
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on("end", () => {
          const rawBody = Buffer.concat(chunks).toString("utf8");
          const payload = parseJson<T | ApiErrorPayload>(rawBody);
          const statusCode = response.statusCode ?? 500;

          if (statusCode >= 200 && statusCode < 300) {
            resolve((payload ?? ({} as T)) as T);
            return;
          }

          reject(new Error(readErrorMessage(statusCode, payload as ApiErrorPayload | null, rawBody)));
        });
      },
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(Object.assign(new Error("Request timed out."), { code: "ETIMEDOUT" }));
    });

    request.on("error", (error) => {
      reject(new Error(mapNetworkError(error)));
    });

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

export async function fetchSystemStatus() {
  return requestJson<SystemStatusResponse>("system/live-status");
}

export async function fetchDashboardDevices() {
  return requestJson<DeviceConfig[]>("dashboard/devices");
}

export async function fetchAutomations() {
  return requestJson<AutomationResponse[]>("automations");
}

export async function updateAutomationEnabledState(automation: AutomationResponse, isEnabled: boolean) {
  return requestJson<AutomationResponse>(`automation/${automation.id}`, {
    method: "PUT",
    body: {
      name: automation.name,
      is_enabled: isEnabled,
      graph: automation.graph,
    },
  });
}

export async function triggerAutomation(automationId: number) {
  return requestJson<TriggerResponse>(`automation/${automationId}/trigger`, { method: "POST" });
}

export async function sendDeviceCommand(deviceId: string, payload: Record<string, unknown>) {
  return requestJson<DeviceCommandResponse>(`device/${encodeURIComponent(deviceId)}/command`, {
    method: "POST",
    body: payload,
  });
}
