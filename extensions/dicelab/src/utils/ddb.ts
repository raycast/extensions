// D&D Beyond utilities ported from web/src/features/aliases.js

export interface DdbInput {
  kind: "inline" | "url" | "raw";
  value: string;
}

export function extractDdbInput(raw: string): DdbInput {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    return { kind: "inline", value: trimmed };
  }

  const withoutQuery = trimmed.split(/[?#]/)[0].replace(/\/+$/, "");
  const segments = withoutQuery.split("/").filter(Boolean);

  const charactersIdx = segments
    .map((seg) => seg.toLowerCase())
    .lastIndexOf("characters");
  if (charactersIdx !== -1) {
    const next = segments[charactersIdx + 1];
    if (next && /^\d+$/.test(next)) {
      return { kind: "url", value: next };
    }
  }

  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const seg = segments[i];
    if (/^\d+$/.test(seg)) {
      return { kind: "url", value: seg };
    }
    const numericRuns = seg.match(/\d+/g);
    if (numericRuns && numericRuns.length > 0) {
      return { kind: "url", value: numericRuns[numericRuns.length - 1] };
    }
  }

  return { kind: "raw", value: trimmed };
}

export function aliasEntries(aliases: unknown): Array<[string, unknown]> {
  if (!aliases) return [];
  if (aliases instanceof Map) return Array.from(aliases.entries());
  if (typeof aliases === "object") return Object.entries(aliases);
  return [];
}

export function serializeAliases(aliases: unknown): Record<string, unknown> {
  const entries = aliasEntries(aliases);
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    try {
      normalized[key] = JSON.parse(JSON.stringify(value));
    } catch (_err) {
      normalized[key] = value;
    }
  }
  return normalized;
}
