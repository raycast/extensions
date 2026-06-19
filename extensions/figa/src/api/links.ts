export const FIGA_DEVELOPER_API_DOCS_URL = "https://getfiga.com/help/developers/api";

const FIGA_APP_ORIGIN = "https://app.figa.cc";

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
  return getFigaAppUrl(`/workspaces/${encodeURIComponent(workspaceId)}/categories/${encodeURIComponent(categoryId)}`);
}

export function getFigaRecipientsUrl(workspaceId: string): string {
  return getFigaAppUrl(`/workspaces/${encodeURIComponent(workspaceId)}/recipients`);
}

export function getFigaRecipientUrl(workspaceId: string, recipientId: string): string {
  return getFigaAppUrl(`/workspaces/${encodeURIComponent(workspaceId)}/recipients/${encodeURIComponent(recipientId)}`);
}

export function getFigaExpensesUrl(workspaceId: string, query?: object): string {
  return getFigaAppUrl(`/workspaces/${encodeURIComponent(workspaceId)}/expenses`, query);
}

export function getFigaExpenseUrl(workspaceId: string, expenseId: string): string {
  return getFigaAppUrl(`/workspaces/${encodeURIComponent(workspaceId)}/expenses/${encodeURIComponent(expenseId)}`);
}

function getFigaAppUrl(path: string, query?: object): string {
  const url = new URL(path, `${FIGA_APP_ORIGIN}/`);

  if (query) {
    for (const [key, value] of Object.entries(query) as Array<[string, string | number | boolean | undefined]>) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}
