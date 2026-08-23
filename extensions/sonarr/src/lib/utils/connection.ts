import { getPreferenceValues } from "@raycast/api";
import type { SonarrPreferences } from "@/lib/types/preferences";

/**
 * Resolves the Sonarr base URL from the connection preferences.
 *
 * `Host` is meant to hold a bare hostname or IP, with the port in its own
 * preference. Full URLs (`http://sonarr.example.com:8989`) and `host:port`
 * forms are still normalized here so configurations created while those were
 * advertised keep working.
 *
 * This is the single place that reads the connection preferences: API requests
 * and the "Open in Sonarr" browser links both build on it, so they cannot
 * disagree about which URL the instance lives at.
 */
export function getSonarrBaseUrl(): string {
  const preferences = getPreferenceValues<SonarrPreferences>();
  const rawHost = preferences.host.trim();
  const rawPort = preferences.port.trim();
  const rawBase = preferences.base.trim();

  let protocol: string = preferences.http;
  let host = rawHost;
  let port = rawPort;
  let baseFromHost = "";

  if (/^https?:\/\//i.test(rawHost)) {
    try {
      const parsed = new URL(rawHost);
      protocol = parsed.protocol.replace(":", "");
      host = parsed.hostname;
      // An explicit URL fully describes the endpoint: no port means the
      // scheme default, not the Port preference. Appending it here would
      // break the common `https://sonarr.example.com` reverse-proxy setup.
      port = parsed.port;
      baseFromHost = parsed.pathname === "/" ? "" : parsed.pathname;
    } catch {
      // Keep the original values and let the request fail with a clear error.
    }
  } else {
    const slashIndex = host.indexOf("/");

    if (slashIndex !== -1) {
      baseFromHost = host.slice(slashIndex + 1);
      host = host.slice(0, slashIndex);
    }

    const hostPortMatch = host.match(/^(.+):(\d+)$/);
    if (hostPortMatch) {
      host = hostPortMatch[1];
      port = hostPortMatch[2];
    }
  }

  host = host.replace(/\/+$/g, "");
  const basePath = (rawBase || baseFromHost).replace(/^\/|\/$/g, "");

  return `${protocol}://${host}${port ? `:${port}` : ""}${basePath ? `/${basePath}` : ""}`;
}
