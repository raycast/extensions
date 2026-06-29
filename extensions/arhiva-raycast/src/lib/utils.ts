export function normalizeCollapsedWhitespace(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ");
}

export function trimToUndefined(value?: string | null): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? undefined : trimmed;
}

export function normalizeTagLabel(value: string): string {
  return normalizeCollapsedWhitespace(value);
}

export function toTagKey(value: string): string {
  return normalizeTagLabel(value).toLowerCase();
}

export function dedupeTags(tags: ReadonlyArray<string>): Array<string> {
  const seen = new Set<string>();
  const result: Array<string> = [];
  for (const tag of tags) {
    const normalized = normalizeTagLabel(tag);
    if (!normalized) {
      continue;
    }
    const key = toTagKey(normalized);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

export function extractTagTokens(query: string): Array<string> {
  const matches = query.match(/#[^\s]+/g) ?? [];
  const result = new Set<string>();
  for (const match of matches) {
    const normalized = toTagKey(match.slice(1));
    if (!normalized) {
      continue;
    }
    result.add(normalized);
  }
  return [...result];
}

export function getHostnameLabel(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

export function isHttpUrlString(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
