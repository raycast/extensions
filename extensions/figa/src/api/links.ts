import { getFigaPreferences } from "./preferences";

export const FIGA_DEVELOPER_API_DOCS_URL = "https://getfiga.com/help/developers/api";

const DEFAULT_FIGA_APP_ORIGIN = "https://app.figa.cc";

const APP_ORIGIN_BY_API_ORIGIN: Record<string, string> = {
  "https://api.figa.cc": "https://app.figa.cc",
  "https://dev-api.figa.cc": "https://dev-app.figa.cc",
};

export function getFigaApiKeySettingsUrl(workspaceId?: string): string {
  if (!workspaceId) return getFigaAppUrl("/settings/workspace/api-keys");
  return getFigaAppUrl(`/workspaces/${encodeURIComponent(workspaceId)}/settings/api-keys`);
}

export function getFigaBillingUrl(): string {
  return getFigaAppUrl("/settings/billing");
}

export function getFigaWorkspaceSettingsUrl(workspaceId: string): string {
  return getFigaAppUrl(`/workspaces/${encodeURIComponent(workspaceId)}/settings/general`);
}

function getFigaAppUrl(path: string): string {
  const origin = getConfiguredAppOrigin();
  return new URL(path, `${origin}/`).toString();
}

function getConfiguredAppOrigin(): string {
  try {
    const apiOrigin = new URL(getFigaPreferences().apiBaseUrl).origin;
    return APP_ORIGIN_BY_API_ORIGIN[apiOrigin] ?? apiOrigin;
  } catch {
    return DEFAULT_FIGA_APP_ORIGIN;
  }
}
