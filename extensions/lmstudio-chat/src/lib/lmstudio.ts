import { getPreferenceValues } from "@raycast/api";
import { ApiMessage } from "./payload";
import { ModelInfo } from "./types";

export interface LMStudioConfig {
  baseUrl: string;
  apiToken?: string;
}

export class LMStudioError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "LMStudioError";
  }
}

export function getConfig(): LMStudioConfig {
  const prefs = getPreferenceValues<Preferences>();
  const baseUrl = (prefs.baseUrl?.trim() || "http://localhost:1234").replace(
    /\/+$/,
    "",
  );
  return { baseUrl, apiToken: prefs.apiToken?.trim() || undefined };
}

export function isConnectionError(e: unknown): boolean {
  return e instanceof TypeError && !(e instanceof LMStudioError);
}

function headers(config: LMStudioConfig): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiToken) h["Authorization"] = `Bearer ${config.apiToken}`;
  return h;
}

async function request(
  config: LMStudioConfig,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  // No caller passes init.headers — auth/content-type always come from
  // headers(config), so don't pretend to merge caller headers unsafely.
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: headers(config),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new LMStudioError(
      `LM Studio request failed (${response.status}): ${body.slice(0, 200)}`,
      response.status,
    );
  }
  return response;
}

export async function listLoadedModels(
  config: LMStudioConfig,
): Promise<string[]> {
  const response = await request(config, "/v1/models");
  const json = (await response.json()) as { data?: { id: string }[] };
  return (json.data ?? []).map((m) => m.id);
}

interface NativeModelEntry {
  id?: string;
  key?: string;
  type?: string;
  loaded_instances?: { id: string }[];
  capabilities?: { vision?: boolean };
}

export async function listAllModels(
  config: LMStudioConfig,
): Promise<ModelInfo[]> {
  const response = await request(config, "/api/v1/models");
  const json = (await response.json()) as {
    data?: NativeModelEntry[];
    models?: NativeModelEntry[];
  };
  const entries = json.models ?? json.data ?? [];
  return entries
    .map((e) => {
      const instanceIds = (e.loaded_instances ?? []).map((inst) => inst.id);
      return {
        id: e.key ?? e.id ?? "",
        loaded: instanceIds.length > 0,
        instanceIds,
        kind: e.type ?? "llm",
        vision: e.capabilities?.vision ?? false,
      };
    })
    .filter((m) => m.id !== "");
}

export async function loadModel(
  config: LMStudioConfig,
  id: string,
): Promise<void> {
  await request(config, "/api/v1/models/load", {
    method: "POST",
    body: JSON.stringify({ model: id }),
  });
}

export async function unloadModel(
  config: LMStudioConfig,
  instanceId: string,
): Promise<void> {
  await request(config, "/api/v1/models/unload", {
    method: "POST",
    body: JSON.stringify({ instance_id: instanceId }),
  });
}

export function splitSSEEvents(buffer: string): {
  events: string[];
  rest: string;
} {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  return { events: parts.filter((p) => p.trim() !== ""), rest };
}

export function extractDelta(eventData: string): string | null {
  const line = eventData.split("\n").find((l) => l.startsWith("data:"));
  if (!line) return null;
  const payload = line.slice(5).trim();
  if (payload === "[DONE]") return null;
  try {
    const json = JSON.parse(payload) as {
      choices?: { delta?: { content?: string } }[];
    };
    return json.choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
  }
}

export async function* chatStream(
  config: LMStudioConfig,
  params: {
    model: string;
    messages: ApiMessage[];
    temperature: number;
    signal?: AbortSignal;
  },
): AsyncGenerator<string> {
  const response = await request(config, "/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      stream: true,
    }),
    signal: params.signal,
  });
  if (!response.body)
    throw new LMStudioError("Empty response body from LM Studio");

  const decoder = new TextDecoder();
  let buffer = "";
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = splitSSEEvents(buffer);
      buffer = rest;
      for (const event of events) {
        const delta = extractDelta(event);
        if (delta !== null) yield delta;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
