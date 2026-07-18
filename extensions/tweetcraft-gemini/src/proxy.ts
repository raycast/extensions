export function normalizeProxyUrl(proxyUrl?: string): string | undefined {
  const trimmed = proxyUrl?.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error();
    }
    return parsed.toString();
  } catch {
    throw new Error("Invalid proxy URL. Use an HTTP or HTTPS URL, for example http://127.0.0.1:7897");
  }
}

export function formatProxyRoute(proxyUrl: string): string {
  const parsed = new URL(proxyUrl);
  return `${parsed.protocol}//${parsed.host}`;
}
