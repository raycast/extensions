import { get, type IncomingMessage } from "node:http";
import { text } from "node:stream/consumers";
import { isDashboardID } from "./deeplinks";

export interface ConnectionPreferences {
  apiUrl: string;
  apiToken: string;
}

export interface Dashboard {
  id: string;
  title?: string;
  icon?: string;
  enabled: boolean;
  disabled_reason?: string;
}

type ConnectionErrorKind = "configuration" | "authentication" | "unavailable" | "timeout" | "response";

export class MetrixError extends Error {
  constructor(
    public readonly kind: ConnectionErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "MetrixError";
  }
}

function dashboardsEndpoint(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new MetrixError("configuration", "Enter the local API base URL from Metrix.Bar’s Agent settings.");
  }
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new MetrixError("configuration", "Use an HTTP loopback base URL, such as http://127.0.0.1:6387.");
  }
  url.pathname = "/v0/dashboards";
  return url;
}

function isDashboard(value: unknown): value is Dashboard {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    isDashboardID(item.id) &&
    (item.title === undefined || typeof item.title === "string") &&
    (item.icon === undefined || typeof item.icon === "string") &&
    typeof item.enabled === "boolean" &&
    (item.disabled_reason === undefined || typeof item.disabled_reason === "string")
  );
}

function parseDashboards(body: string): Dashboard[] {
  try {
    const result: unknown = JSON.parse(body);
    if (typeof result === "object" && result !== null && "dashboards" in result) {
      const items: unknown = result.dashboards;
      if (Array.isArray(items) && items.every(isDashboard)) return items;
    }
  } catch {
    // Response bodies may contain private data; show only a fixed diagnostic.
  }
  throw new MetrixError("response", "Metrix.Bar returned an invalid dashboard list. Update the app and try again.");
}

export async function fetchDashboards(preferences: ConnectionPreferences, signal?: AbortSignal): Promise<Dashboard[]> {
  const url = dashboardsEndpoint(preferences.apiUrl);
  const token = preferences.apiToken.trim();
  if (!token || /[\r\n]/u.test(token)) {
    throw new MetrixError("configuration", "Enter the API token from Metrix.Bar’s Agent settings.");
  }
  const timeout = AbortSignal.timeout(5_000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      // An explicit agent also bypasses Node's opt-in environment proxy support.
      get(url, { agent: false, headers: { Authorization: `Bearer ${token}` }, signal: requestSignal }, resolve).on(
        "error",
        reject,
      );
    });
    if (response.statusCode !== 200) {
      response.destroy();
      throw response.statusCode === 401 || response.statusCode === 403
        ? new MetrixError(
            "authentication",
            "Check the API token in extension preferences and Metrix.Bar’s Agent settings.",
          )
        : new MetrixError("response", "The local API could not return dashboards. Check the API URL and try again.");
    }
    return parseDashboards(await text(response));
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    if (timeout.aborted) throw new MetrixError("timeout", "Metrix.Bar took too long to respond. Try again.");
    if (error instanceof MetrixError) throw error;
    throw new MetrixError("unavailable", "Open Metrix.Bar and check that its local API is enabled in Agent settings.");
  }
}
