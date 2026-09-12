const SITE = 'https://adjacent.markets';
const DOCS = 'https://docs.adjacent.markets';
const API = 'https://api.adjacent.markets/api/v1';

export const site = {
  home: SITE,
  subscribe: `${SITE}/subscribe`,
  settingsKeys: `${SITE}/settings/api-keys`,
  indices: `${SITE}/indices`,
  news: `${SITE}/news`,
  index: (id: string) => `${SITE}/indices/${encodeURIComponent(id)}`,
  docs: DOCS,
  mcp: `${DOCS}/explore/mcp`,
  api: API,
};

export function exportUrl(path: string, apiKey?: string): string {
  const url = new URL(`${API}/export/${path.replace(/^\//, '')}`);
  if (apiKey) url.searchParams.set('api_key', apiKey);
  return url.toString();
}

export function docsZipUrl(): string {
  return `${DOCS}/docs.zip`;
}
