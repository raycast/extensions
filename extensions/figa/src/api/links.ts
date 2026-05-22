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

export function getFigaCategoriesUrl(workspaceId: string): string {
  return getFigaAppUrl(`/workspaces/${encodeURIComponent(workspaceId)}/categories`);
}

export function getFigaCategoryUrl(workspaceId: string, categoryId: string): string {
  return getFigaAppUrl(
    `/workspaces/${encodeURIComponent(workspaceId)}/categories/${encodeURIComponent(categoryId)}`,
  );
}

export function getFigaRecipientsUrl(workspaceId: string): string {
  return getFigaAppUrl(`/workspaces/${encodeURIComponent(workspaceId)}/recipients`);
}

export function getFigaRecipientUrl(workspaceId: string, recipientId: string): string {
  return getFigaAppUrl(
    `/workspaces/${encodeURIComponent(workspaceId)}/recipients/${encodeURIComponent(recipientId)}`,
  );
}

export function getFigaExpensesUrl(workspaceId: string, query?: object): string {
  return getFigaAppUrl(`/workspaces/${encodeURIComponent(workspaceId)}/expenses`, query);
}

export function getFigaExpenseUrl(workspaceId: string, expenseId: string): string {
  return getFigaAppUrl(
    `/workspaces/${encodeURIComponent(workspaceId)}/expenses/${encodeURIComponent(expenseId)}`,
  );
}

function getFigaAppUrl(path: string, query?: object): string {
  const origin = getConfiguredAppOrigin();
  const url = new URL(path, `${origin}/`);

  if (query) {
    for (const [key, value] of Object.entries(query) as Array<
      [string, string | number | boolean | undefined]
    >) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function getConfiguredAppOrigin(): string {
  try {
    const apiOrigin = new URL(getFigaPreferences().apiBaseUrl).origin;
    return APP_ORIGIN_BY_API_ORIGIN[apiOrigin] ?? apiOrigin;
  } catch {
    return DEFAULT_FIGA_APP_ORIGIN;
  }
}
