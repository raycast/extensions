import { getPreferenceValues } from "@raycast/api";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import JSON5 from "json5";

const LOOPBACK_GATEWAY_URL = "ws://127.0.0.1:18789";

export type ConnectionMode = Preferences["connectionMode"];

export type CloudflareAuthMode = Preferences["cloudflareAuthMode"];

type Credentials = {
  token?: string;
  password?: string;
};

type FileGatewayConfig = {
  found: boolean;
  remoteGatewayUrl?: string;
  local: Credentials;
  remote: Credentials;
  remoteMode?: boolean;
};

export type ResolvedPreferences = Preferences & {
  connectionMode: ConnectionMode;
  endpoint: string;
  gatewayUrl: string;
  webUrl: string;
  token: string;
  password: string;
  agentId: string;
  cloudflareAuthMode: CloudflareAuthMode;
  edgeAuthHeaders?: Readonly<Record<string, string>>;
};

export const CONNECTION_MODE_LABELS: Record<ConnectionMode, string> = {
  config: "OpenClaw Configuration",
  local: "Local Gateway",
  network: "Local Network",
  tailscale: "Tailscale",
  cloudflare: "Cloudflare Tunnel and Access",
};

export const CLOUDFLARE_AUTH_MODE_LABELS: Record<CloudflareAuthMode, string> = {
  browser: "Browser sign-in",
  "service-token": "Service token",
};

function trimUrlPathSlash(value: string): string {
  return value.replace(/\/(?=[?#]|$)/, "");
}

export function toGatewayUrl(value: string): string {
  const candidate = value.trim() || LOOPBACK_GATEWAY_URL;
  const parsed = new URL(
    /^[a-z][a-z\d+.-]*:\/\//i.test(candidate)
      ? candidate
      : `wss://${candidate}`,
  );

  if (parsed.protocol === "http:") parsed.protocol = "ws:";
  if (parsed.protocol === "https:") parsed.protocol = "wss:";
  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw new Error(
      "Gateway URL must use ws://, wss://, http://, or https://.",
    );
  }

  return trimUrlPathSlash(parsed.toString());
}

export function toWebUrl(value: string): string {
  const parsed = new URL(toGatewayUrl(value));
  parsed.protocol = parsed.protocol === "wss:" ? "https:" : "http:";
  return trimUrlPathSlash(parsed.toString());
}

export function isLoopbackGateway(value: string): boolean {
  try {
    const hostname = new URL(toGatewayUrl(value)).hostname;
    return (
      hostname === "127.0.0.1" ||
      hostname === "localhost" ||
      hostname === "::1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

function readOpenClawFileConfig(): FileGatewayConfig {
  try {
    const raw = readFileSync(
      join(homedir(), ".openclaw", "openclaw.json"),
      "utf8",
    );
    const parsed = JSON5.parse(raw) as {
      gateway?: {
        mode?: unknown;
        auth?: { token?: unknown; password?: unknown };
        remote?: { token?: unknown; password?: unknown; url?: unknown };
      };
    };
    const gateway = parsed.gateway;
    if (!gateway) return { found: false, local: {}, remote: {} };

    const stringCredential = (value: unknown): string | undefined =>
      typeof value === "string" && value.trim() ? value.trim() : undefined;

    return {
      found: true,
      remoteGatewayUrl:
        typeof gateway.remote?.url === "string"
          ? gateway.remote.url.trim()
          : undefined,
      local: {
        token: stringCredential(gateway.auth?.token),
        password: stringCredential(gateway.auth?.password),
      },
      remote: {
        token: stringCredential(gateway.remote?.token),
        password: stringCredential(gateway.remote?.password),
      },
      remoteMode: gateway.mode === "remote",
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { found: false, local: {}, remote: {} };
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read ~/.openclaw/openclaw.json: ${message}`);
  }
}

function remoteGatewayUrl(
  mode: "network" | "tailscale" | "cloudflare",
  endpoint: string,
): string {
  if (!endpoint) {
    throw new Error(
      `Set the Gateway URL for ${CONNECTION_MODE_LABELS[mode]} in extension preferences.`,
    );
  }

  const gatewayUrl = toGatewayUrl(endpoint);
  if (new URL(gatewayUrl).protocol !== "wss:") {
    throw new Error(
      `${CONNECTION_MODE_LABELS[mode]} requires a secure wss:// Gateway URL.`,
    );
  }
  if (mode === "network" && isLoopbackGateway(gatewayUrl)) {
    throw new Error(
      "Local Network mode requires the Gateway's LAN hostname or IP address.",
    );
  }

  return gatewayUrl;
}

function configuredRemoteGatewayUrl(
  file: FileGatewayConfig,
): string | undefined {
  if (!file.remoteGatewayUrl) return undefined;

  try {
    return toGatewayUrl(file.remoteGatewayUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`gateway.remote.url is invalid: ${message}`);
  }
}

function matchingRemoteCredentials(
  file: FileGatewayConfig,
  gatewayUrl: string,
): Credentials {
  if (!file.remote.token && !file.remote.password) return {};

  try {
    return configuredRemoteGatewayUrl(file) === gatewayUrl ? file.remote : {};
  } catch {
    return {};
  }
}

function resolveConnection(
  mode: ConnectionMode,
  endpoint: string,
  file: FileGatewayConfig,
): { gatewayUrl: string; credentials: Credentials } {
  if (mode === "local") {
    return { gatewayUrl: LOOPBACK_GATEWAY_URL, credentials: file.local };
  }

  if (mode === "config") {
    if (!file.found) {
      throw new Error(
        "OpenClaw configuration was not found at ~/.openclaw/openclaw.json.",
      );
    }
    if (file.remoteMode) {
      const gatewayUrl = configuredRemoteGatewayUrl(file);
      if (!gatewayUrl) {
        throw new Error(
          "gateway.mode is remote, but gateway.remote.url is missing from OpenClaw configuration.",
        );
      }
      if (
        !isLoopbackGateway(gatewayUrl) &&
        new URL(gatewayUrl).protocol !== "wss:"
      ) {
        throw new Error(
          "gateway.remote.url requires a secure wss:// URL when it is not loopback.",
        );
      }
      return {
        gatewayUrl,
        credentials: file.remote,
      };
    }
    return { gatewayUrl: LOOPBACK_GATEWAY_URL, credentials: file.local };
  }

  if (endpoint) {
    const gatewayUrl = remoteGatewayUrl(mode, endpoint);
    return {
      gatewayUrl,
      credentials: matchingRemoteCredentials(file, gatewayUrl),
    };
  }

  const configuredGatewayUrl = configuredRemoteGatewayUrl(file);
  return {
    gatewayUrl: remoteGatewayUrl(mode, configuredGatewayUrl || ""),
    credentials: file.remote,
  };
}

export function getPreferences(): ResolvedPreferences {
  const preferences = getPreferenceValues<Preferences>();
  const connectionMode = preferences.connectionMode;
  if (!connectionMode || !(connectionMode in CONNECTION_MODE_LABELS)) {
    throw new Error("Choose how Raycast should connect to OpenClaw.");
  }

  const file = readOpenClawFileConfig();
  const endpoint = String(preferences.endpoint ?? "").trim();
  const connection = resolveConnection(connectionMode, endpoint, file);
  const token =
    String(preferences.token ?? "").trim() ||
    connection.credentials.token ||
    "";
  const password =
    String(preferences.password ?? "").trim() ||
    connection.credentials.password ||
    "";

  const cloudflareAuthMode = preferences.cloudflareAuthMode ?? "browser";
  if (!(cloudflareAuthMode in CLOUDFLARE_AUTH_MODE_LABELS)) {
    throw new Error(
      "Choose how Raycast should authenticate to Cloudflare Access.",
    );
  }

  const cloudflareClientId = String(
    preferences.cloudflareAccessClientId ?? "",
  ).trim();
  const cloudflareClientSecret = String(
    preferences.cloudflareAccessClientSecret ?? "",
  ).trim();
  if (
    connectionMode === "cloudflare" &&
    cloudflareAuthMode === "service-token" &&
    (!cloudflareClientId || !cloudflareClientSecret)
  ) {
    throw new Error(
      "Set both Cloudflare Access service-token fields in extension preferences.",
    );
  }
  const edgeAuthHeaders =
    connectionMode === "cloudflare" &&
    cloudflareAuthMode === "service-token" &&
    cloudflareClientId &&
    cloudflareClientSecret
      ? {
          "CF-Access-Client-Id": cloudflareClientId,
          "CF-Access-Client-Secret": cloudflareClientSecret,
        }
      : undefined;

  return {
    ...preferences,
    connectionMode,
    endpoint: toWebUrl(connection.gatewayUrl),
    gatewayUrl: connection.gatewayUrl,
    webUrl: toWebUrl(connection.gatewayUrl),
    token,
    password,
    agentId: String(preferences.agentId ?? "").trim() || "main",
    cloudflareAuthMode,
    edgeAuthHeaders,
  };
}
