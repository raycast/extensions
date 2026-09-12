export const RAILWAY_HOSTS = new Set([
  "status.railway.app",
  "status.railway.com",
]);

export function normalizeSiteUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("URL is required");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP(S) URLs are supported");
  }

  url.hash = "";
  url.search = "";
  const normalizedPath = url.pathname.replace(/\/+$/, "") || "";

  return normalizedPath ? `${url.origin}${normalizedPath}` : url.origin;
}

export function getOrigin(siteUrl: string): string {
  return new URL(siteUrl).origin;
}

export function isRailwayHost(siteUrl: string): boolean {
  try {
    return RAILWAY_HOSTS.has(new URL(siteUrl).hostname);
  } catch {
    return false;
  }
}
