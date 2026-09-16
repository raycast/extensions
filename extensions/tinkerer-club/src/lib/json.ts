import { JsonObject, JsonValue } from "../types/api";

export function isJsonObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every(isJsonValue)
  );
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  return isJsonObject(value);
}

export function parseJsonValue(text: string, label = "JSON"): JsonValue {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }

  if (!isJsonValue(parsed)) {
    throw new Error(`${label} contains a value that JSON cannot represent.`);
  }

  return parsed;
}

export function formatJson(value: JsonValue): string {
  return JSON.stringify(value, null, 2);
}

export function unwrapPayload(value: JsonValue): JsonValue {
  if (!isJsonObject(value)) {
    return value;
  }

  const result = value.result;
  if (isJsonObject(result)) {
    const data = result.data;
    if (isJsonObject(data) && "json" in data) {
      return data.json;
    }
    if (data !== undefined) {
      return data;
    }
  }

  if ("data" in value) {
    return value.data;
  }

  if ("json" in value) {
    return value.json;
  }

  return value;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred.";
}
