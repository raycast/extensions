import { humanizeIdentifier } from "./catalog";
import { formatJson, isJsonObject, unwrapPayload } from "./json";
import { JsonObject, JsonValue } from "../types/api";

export interface DisplayItem {
  id: string;
  kind?: string;
  subtitle?: string;
  title: string;
  url?: string;
  value: JsonValue;
}

const TITLE_FIELDS = ["title", "name", "displayName", "username", "slug", "email", "id"] as const;
const SUBTITLE_FIELDS = ["description", "bio", "summary", "email", "status", "type"] as const;
const URL_FIELDS = ["url", "href", "webUrl", "permalink"] as const;

function firstString(record: JsonObject, fields: readonly string[]): string | undefined {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function validWebUrl(value: string | undefined, baseUrl?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = baseUrl ? new URL(value, `${baseUrl}/`) : new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function extractEntries(payload: JsonValue): { kind?: string; value: JsonValue }[] {
  const value = unwrapPayload(payload);
  if (Array.isArray(value)) {
    return value.map((item) => ({ value: item }));
  }
  if (!isJsonObject(value)) {
    return [{ value }];
  }

  const preferred = ["items", "results", "members", "posts", "prompts", "events", "requests"];
  for (const key of preferred) {
    const candidate = value[key];
    if (Array.isArray(candidate)) {
      return candidate.map((item) => ({ kind: humanizeIdentifier(key), value: item }));
    }
  }

  const grouped = Object.entries(value).flatMap(([key, candidate]) =>
    Array.isArray(candidate) ? candidate.map((item) => ({ kind: humanizeIdentifier(key), value: item })) : [],
  );
  return grouped.length > 0 ? grouped : [{ value }];
}

export function toDisplayItems(payload: JsonValue, baseUrl?: string): DisplayItem[] {
  return extractEntries(payload).map(({ kind, value }, index) => {
    const record = isJsonObject(value) ? value : undefined;
    const identity = record ? firstString(record, ["id", "slug", "username", "email"]) : undefined;
    const title = record ? firstString(record, TITLE_FIELDS) : undefined;
    const subtitle = record ? firstString(record, SUBTITLE_FIELDS) : undefined;
    const url = record ? validWebUrl(firstString(record, URL_FIELDS), baseUrl) : undefined;

    return {
      id: `${kind ?? "result"}:${identity ?? index}`,
      ...(kind ? { kind } : {}),
      ...(subtitle ? { subtitle } : {}),
      title: title ?? (typeof value === "string" ? value : `Result ${index + 1}`),
      ...(url ? { url } : {}),
      value,
    };
  });
}

export function jsonMarkdown(title: string, value: JsonValue): string {
  const safeTitle = title.replace(/[\r\n#]/g, " ").trim();
  return `# ${safeTitle}\n\n\`\`\`\`json\n${formatJson(value)}\n\`\`\`\``;
}
