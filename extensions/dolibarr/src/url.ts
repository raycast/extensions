const API_PATH = "/api/index.php";

/** Turns whatever the user typed into a usable API base URL. */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (trimmed.length === 0) {
    throw new Error("The Dolibarr URL is empty.");
  }
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.endsWith(API_PATH) ? withScheme : `${withScheme}${API_PATH}`;
}

/** The instance root without the API path — used to build browser deep links. */
export function stripApiPath(baseUrl: string): string {
  return baseUrl.endsWith(API_PATH) ? baseUrl.slice(0, -API_PATH.length) : baseUrl;
}
