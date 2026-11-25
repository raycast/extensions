export const APP_URL = "metrixbar://open";
export const AGENT_SETTINGS_URL = "metrixbar://settings/agent";

export function isDashboardID(id: string): boolean {
  return id.length > 0 && id !== "." && id !== ".." && !/[/\\\0\uD800-\uDFFF]/u.test(id);
}

export function dashboardURL(dashboard: { id: string; enabled: boolean }): string {
  if (!isDashboardID(dashboard.id)) {
    throw new Error("Invalid dashboard ID");
  }
  const route = dashboard.enabled ? "panel" : "open";
  return `metrixbar://${route}/${encodeURIComponent(dashboard.id)}`;
}

export function dashboardSettingsURL(id: string): string {
  return dashboardURL({ id, enabled: false });
}
