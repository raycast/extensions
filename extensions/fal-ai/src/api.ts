import { getPreferenceValues } from "@raycast/api";
import {
  FalAsset,
  FalModel,
  FalModelsResponse,
  QueueStatusResponse,
  QueueSubmitResponse,
} from "./types";

const PLATFORM_API = "https://api.fal.ai/v1";
const QUEUE_API = "https://queue.fal.run";

function getApiKey() {
  return getPreferenceValues<Preferences>().apiKey.trim();
}

function authorizationHeader() {
  return `Key ${getApiKey().replace(/^Key\s+/i, "")}`;
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: authorizationHeader(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = parseJson(text);

  if (!response.ok) {
    throw new Error(formatErrorMessage(payload, response));
  }

  return payload as T;
}

function parseJson(text: string): unknown {
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function formatErrorMessage(payload: unknown, response: Response) {
  if (isRecord(payload)) {
    const message =
      payload.detail ?? payload.error ?? payload.message ?? payload.title;
    if (message !== undefined) return stringifyMessage(message);
  }

  if (payload !== undefined) return stringifyMessage(payload);

  return `${response.status} ${response.statusText}`;
}

function stringifyMessage(message: unknown): string {
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.map(stringifyMessage).join("\n");
  if (isRecord(message)) {
    const nested =
      message.msg ?? message.message ?? message.detail ?? message.error;
    if (nested !== undefined) return stringifyMessage(nested);
    return JSON.stringify(message);
  }
  return String(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function searchModels(
  query: string,
  cursor?: string | null,
): Promise<FalModelsResponse> {
  const params = new URLSearchParams();
  params.set("limit", "25");
  params.set("status", "active");
  if (query.trim()) params.set("q", query.trim());
  if (cursor) params.set("cursor", cursor);

  return requestJson<FalModelsResponse>(
    `${PLATFORM_API}/models?${params.toString()}`,
  );
}

export async function getModel(
  endpointId: string,
): Promise<FalModel | undefined> {
  const params = new URLSearchParams();
  params.append("endpoint_id", endpointId);
  params.append("expand", "openapi-3.0");

  const response = await requestJson<FalModelsResponse>(
    `${PLATFORM_API}/models?${params.toString()}`,
  );
  return response.models[0];
}

export async function submitGeneration(
  endpointId: string,
  input: Record<string, unknown>,
): Promise<QueueSubmitResponse> {
  return requestJson<QueueSubmitResponse>(`${QUEUE_API}/${endpointId}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getQueueStatus(record: {
  endpointId: string;
  statusUrl?: string;
  id: string;
}): Promise<QueueStatusResponse> {
  const url =
    record.statusUrl ??
    `${QUEUE_API}/${record.endpointId}/requests/${record.id}/status`;
  const separator = url.includes("?") ? "&" : "?";
  return requestJson<QueueStatusResponse>(`${url}${separator}logs=1`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function getQueueResult(record: {
  endpointId: string;
  responseUrl?: string;
  id: string;
}): Promise<unknown> {
  const url =
    record.responseUrl ??
    `${QUEUE_API}/${record.endpointId}/requests/${record.id}/response`;
  return requestJson<unknown>(url, { method: "GET" });
}

export async function cancelGeneration(record: {
  endpointId: string;
  cancelUrl?: string;
  id: string;
}): Promise<void> {
  const url =
    record.cancelUrl ??
    `${QUEUE_API}/${record.endpointId}/requests/${record.id}/cancel`;
  await requestJson<unknown>(url, { method: "PUT" });
}

export async function browseAssets(
  query: string,
  mediaType?: string,
): Promise<FalAsset[]> {
  const params = new URLSearchParams();
  params.set("limit", "25");
  params.set("section", "all-media");
  if (query.trim()) params.set("q", query.trim());
  if (mediaType) params.append("media_type", mediaType);

  const response = await requestJson<{ assets: FalAsset[] }>(
    `${PLATFORM_API}/assets?${params.toString()}`,
    {
      method: "GET",
    },
  );
  return response.assets;
}
