import { DASHBOARD_ORIGIN, SITE_ORIGIN, SOURCE } from "./config";

export type DashboardView = "board" | "inbox" | "execution";

// The dashboard is a single route; screens and the open card are query params. Every link
// this extension opens carries source=raycast-extension so the web side attributes the visit.
export function dashboardUrl(view: DashboardView = "board", cardId?: string): string {
  const params = new URLSearchParams({ view, source: SOURCE });
  if (cardId) params.set("card", cardId);
  return `${DASHBOARD_ORIGIN}/?${params.toString()}`;
}

export function siteUrl(path = "/"): string {
  const url = new URL(path, SITE_ORIGIN);
  url.searchParams.set("source", SOURCE);
  return url.toString();
}
