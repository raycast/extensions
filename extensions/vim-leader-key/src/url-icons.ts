export function getFaviconUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return undefined;
    }

    return `${url.origin}/favicon.ico`;
  } catch {
    return undefined;
  }
}

export function normalizeCustomIconValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}
