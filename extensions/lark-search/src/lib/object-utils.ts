export function pick(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, value);
}

export function pickString(value: unknown, paths: string[]) {
  for (const path of paths) {
    const picked = pick(value, path);
    const normalized = stringifyValue(picked);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

export function extractArray(data: unknown, paths: string[]) {
  for (const path of paths) {
    const value = pick(data, path);
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

export function stringifyValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      stringifyValue(record.name) ??
      stringifyValue(record.zh_cn) ??
      stringifyValue(record.en_us)
    );
  }

  return undefined;
}

export function cleanText(value?: string) {
  return decodeHtmlEntities(value)?.replace(/\s+/g, " ").trim();
}

export function stripHighlight(value?: string) {
  return cleanText(value?.replaceAll("<h>", "").replaceAll("</h>", ""));
}

export function decodeHtmlEntities(value?: string) {
  return value
    ?.replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

export function parseJsonOrThrow<T>(value: string, context: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${context}: lark-cli returned non-JSON output`);
  }
}

export function parsePositiveLimit(
  value: string | undefined,
  fallback: number,
) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : fallback;
}

export function unique<T>(values: T[]) {
  return [...new Set(values)];
}
