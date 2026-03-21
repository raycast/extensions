import { KeyValueField, WebhookRequest, ValueType } from "./types";

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function parseValue(value: string, type: ValueType): unknown {
  switch (type) {
    case "boolean":
      return value.toLowerCase() === "true";
    case "number": {
      const n = Number(value);
      return isFinite(n) ? n : value;
    }
    case "null":
      return null;
    default:
      return value;
  }
}

export function fieldsToJson(fields: KeyValueField[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.key.trim()) {
      result[field.key.trim()] = parseValue(field.value, field.type);
    }
  }
  return result;
}

export function buildBody(request: WebhookRequest): string | undefined {
  if (request.method === "GET" || request.method === "DELETE") return undefined;

  if (request.bodyMode === "raw") {
    return request.rawJson.trim() || undefined;
  }

  const obj = fieldsToJson(request.fields);
  if (Object.keys(obj).length === 0) return undefined;
  return JSON.stringify(obj);
}

export function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function getValueTypePlaceholder(type: ValueType): string {
  switch (type) {
    case "boolean":
      return "true / false";
    case "number":
      return "42";
    case "null":
      return "null";
    default:
      return "value";
  }
}

export function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "🟢";
  if (status >= 300 && status < 400) return "🟡";
  if (status >= 400 && status < 500) return "🔴";
  if (status >= 500) return "🔴";
  return "⚪";
}

export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function truncateUrl(url: string, maxLen = 50): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen) + "…";
}

export function emptyField(): KeyValueField {
  return { id: generateId(), key: "", value: "", type: "string" };
}

export async function sendWebhook(
  request: WebhookRequest,
): Promise<{ status: number; body: string; responseTime: number }> {
  const body = buildBody(request);
  const headers: Record<string, string> = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(request.headers || {}),
  };

  const start = Date.now();
  const response = await fetch(request.url, {
    method: request.method,
    headers,
    body,
  });

  const responseTime = Date.now() - start;
  let responseBody = "";
  try {
    const text = await response.text();
    responseBody = formatJson(text);
  } catch {
    responseBody = "(no body)";
  }

  return { status: response.status, body: responseBody, responseTime };
}
