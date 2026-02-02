import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  connectionMode: "local" | "remote";
  remoteUrl?: string;
  localPort?: string;
  password?: string;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

/**
 * Converts a user-provided URL to a WebSocket URL for the gateway.
 *
 * Handles:
 * - https://host -> wss://host/gateway
 * - http://host -> ws://host/gateway
 * - wss://host -> wss://host (keeps as-is if already ws/wss)
 * - ws://host:port -> ws://host:port
 * - hostname -> wss://hostname/gateway (assumes HTTPS if no protocol)
 */
function normalizeGatewayUrl(input: string): string {
  let url = input.trim();

  // If no protocol, assume HTTPS (Tailscale Serve/Funnel)
  if (!url.includes("://")) {
    url = `https://${url}`;
  }

  // Parse the URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${input}`);
  }

  // Convert protocol
  let protocol: string;
  if (parsed.protocol === "https:") {
    protocol = "wss:";
  } else if (parsed.protocol === "http:") {
    protocol = "ws:";
  } else if (parsed.protocol === "wss:" || parsed.protocol === "ws:") {
    protocol = parsed.protocol;
  } else {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }

  // Build the WebSocket URL
  // For HTTPS/HTTP URLs via Tailscale, the gateway endpoint is at /gateway
  // For direct WS connections, use the path as provided or default to /
  let path = parsed.pathname;
  if (
    (parsed.protocol === "https:" || parsed.protocol === "http:") &&
    (path === "/" || path === "")
  ) {
    path = "/gateway";
  }

  const port = parsed.port ? `:${parsed.port}` : "";
  return `${protocol}//${parsed.hostname}${port}${path}`;
}

export function getGatewayUrl(): string {
  const prefs = getPreferences();

  if (prefs.connectionMode === "local") {
    const port = prefs.localPort?.trim() || "18789";
    return `ws://127.0.0.1:${port}`;
  }

  const remoteUrl = prefs.remoteUrl?.trim();
  if (!remoteUrl) {
    throw new Error(
      "Remote URL is required when using remote connection mode. Set it in extension preferences.",
    );
  }

  return normalizeGatewayUrl(remoteUrl);
}

export function getAuthConfig(): { password?: string } {
  const prefs = getPreferences();
  return {
    password: prefs.password?.trim() || undefined,
  };
}
