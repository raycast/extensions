export function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = trimTrailingSlash(baseUrl);
  return trimmed.replace(/\/api\/v1$/, "");
}

export function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "");
}
