export function parseWebUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function webUrl(value: string | null | undefined): string {
  const url = parseWebUrl(value);
  if (!url) throw new Error("Enter a full web address that starts with http:// or https://.");
  return url;
}

const TAG_LIMIT = 100;

export function cleanTags(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const value of values) {
    const tag = value.trim().replace(/^#/, "").trim();
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  if (tags.length > TAG_LIMIT) throw new Error(`Use ${TAG_LIMIT} tags or fewer.`);
  return tags;
}

export function parseTags(value: string | undefined): string[] {
  return cleanTags((value ?? "").split(","));
}
