import { getPreferenceValues } from "@raycast/api";
import type { ExecuteResponse, ProbeResponse, SearchResponse } from "./types";

const API_URLS = {
  global: "https://qveris.ai/api/v1",
  china: "https://qveris.cn/api/v1",
} as const;

export class QVerisApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "QVerisApiError";
  }
}

function getConfig() {
  const preferences = getPreferenceValues<Preferences>();
  return {
    apiKey: preferences.apiKey,
    baseUrl: API_URLS[preferences.apiRegion],
  };
}

async function request<T>(path: string, body: Record<string, unknown>, timeoutMs = 30_000): Promise<T> {
  const { apiKey, baseUrl } = getConfig();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new QVerisApiError("QVeris did not respond before the request timed out.");
    }
    throw new QVerisApiError(error instanceof Error ? error.message : "Unable to reach QVeris.");
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new QVerisApiError(`QVeris returned an invalid response (${response.status}).`, response.status);
  }

  if (!response.ok) {
    const message = readErrorMessage(payload) ?? `QVeris request failed (${response.status}).`;
    throw new QVerisApiError(message, response.status);
  }

  const businessError = readBusinessError(payload);
  if (businessError) throw new QVerisApiError(businessError, response.status);

  return payload as T;
}

function readErrorMessage(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const candidate = payload as Record<string, unknown>;
  for (const key of ["error_message", "message", "detail", "error"]) {
    if (typeof candidate[key] === "string" && candidate[key].trim()) return candidate[key];
  }
  return undefined;
}

function readBusinessError(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const candidate = payload as Record<string, unknown>;
  if (candidate.status === "failure") return readErrorMessage(payload);
  return undefined;
}

export function discoverCapabilities(input: {
  query: string;
  limit?: number;
  sessionId?: string;
  language?: "en" | "zh";
}): Promise<SearchResponse> {
  return request<SearchResponse>("/search", {
    query: input.query,
    limit: input.limit ?? 10,
    ...(input.sessionId ? { session_id: input.sessionId } : {}),
    ...(input.language ? { lang: input.language } : {}),
  });
}

export function inspectCapabilities(input: {
  toolIds: string[];
  searchId?: string;
  sessionId?: string;
}): Promise<SearchResponse> {
  return request<SearchResponse>("/tools/by-ids", {
    tool_ids: input.toolIds,
    ...(input.searchId ? { search_id: input.searchId } : {}),
    ...(input.sessionId ? { session_id: input.sessionId } : {}),
  });
}

export function probeCapability(input: {
  toolId: string;
  parameters: Record<string, unknown>;
}): Promise<ProbeResponse> {
  return request<ProbeResponse>(`/tools/probe?tool_id=${encodeURIComponent(input.toolId)}`, {
    parameters: input.parameters,
    checks: ["schema", "quote"],
    live_budget: "none",
  });
}

export function callCapability(input: {
  toolId: string;
  searchId: string;
  parameters: Record<string, unknown>;
  sessionId?: string;
}): Promise<ExecuteResponse> {
  return request<ExecuteResponse>(
    `/tools/execute?tool_id=${encodeURIComponent(input.toolId)}`,
    {
      search_id: input.searchId,
      parameters: input.parameters,
      model: "raycast-ai",
      max_response_size: 20_480,
      ...(input.sessionId ? { session_id: input.sessionId } : {}),
    },
    90_000,
  );
}
