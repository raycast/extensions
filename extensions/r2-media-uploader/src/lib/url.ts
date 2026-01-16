export function joinUrl(baseUrl: string, key: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const path = key.replace(/^\/+/, "");
  return `${base}/${path}`;
}
