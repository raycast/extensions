const TAG_REGEX = /#([\w\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af.+-]+)/gi;

export function parseSearchInput(input: string) {
  if (!input?.trim()) {
    return { keywords: "", tags: [] as string[] };
  }

  const tags: string[] = [];
  const keywords = input
    .replace(TAG_REGEX, (_, tag) => {
      if (tag) {
        tags.push(tag.toLowerCase());
      }
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();

  const normalizedTags = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));

  return { keywords, tags: normalizedTags };
}

export function tagsToString(tags?: string[]) {
  if (!tags?.length) {
    return undefined;
  }
  return tags.join(",");
}

export function extractTagsFromMetadata(metadata: Record<string, unknown>) {
  const raw = (metadata?.Tags ?? metadata?.tags) as unknown;
  if (Array.isArray(raw)) {
    return raw.filter((tag): tag is string => typeof tag === "string");
  }
  if (typeof raw === "string") {
    try {
      if (raw.trim().startsWith("[") || raw.trim().startsWith("{")) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((tag): tag is string => typeof tag === "string");
        }
      }
    } catch {
      // fall through to split
    }
    return raw
      .split(/,|\s/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

export function parseTagsInput(value?: string) {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(/,|\s/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}
