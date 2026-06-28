const DEFAULT_DASHBOARD_BASE_URL = "https://app.daytona.io/dashboard";

export function getDashboardBaseUrl(apiUrl: string | undefined): string {
  const trimmedApiUrl = apiUrl?.trim();
  if (!trimmedApiUrl) {
    return DEFAULT_DASHBOARD_BASE_URL;
  }

  try {
    const parsedUrl = new URL(trimmedApiUrl);
    const basePath = parsedUrl.pathname.replace(/\/+$/, "").replace(/\/api$/i, "");
    const normalizedBasePath = basePath || "";
    return `${parsedUrl.origin}${normalizedBasePath}/dashboard`;
  } catch {
    return DEFAULT_DASHBOARD_BASE_URL;
  }
}

export function getDashboardUrl(apiUrl: string | undefined, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getDashboardBaseUrl(apiUrl)}${normalizedPath}`;
}
