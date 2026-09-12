/**
 * Client information utility for tracking Raycast client usage
 */

import packageJson from "../package.json";

// Get client version from package.json
function getClientVersion(): string {
  return packageJson.version;
}

// Get client environment based on API URL
function getClientEnv(apiUrl: string): string {
  if (apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1")) {
    return "dev";
  } else if (apiUrl.includes("staging") || apiUrl.includes("test")) {
    return "staging";
  } else if (apiUrl.includes("api.toneclone.ai")) {
    return "prod";
  }

  return "unknown";
}

// Get client channel (Raycast)
function getClientChannel(): string {
  return "raycast";
}

export interface ClientInfo {
  name: string;
  version: string;
  channel: string;
  env: string;
}

/**
 * Get current client information for Raycast
 */
export function getClientInfo(apiUrl: string): ClientInfo {
  return {
    name: "raycast",
    version: getClientVersion(),
    channel: getClientChannel(),
    env: getClientEnv(apiUrl),
  };
}

/**
 * Convert client info to query parameters
 */
export function clientInfoToQueryParams(clientInfo: ClientInfo): Record<string, string> {
  const params: Record<string, string> = {};

  if (clientInfo.name) {
    params.client = clientInfo.name;
  }
  if (clientInfo.version) {
    params.client_version = clientInfo.version;
  }
  if (clientInfo.channel) {
    params.client_channel = clientInfo.channel;
  }
  if (clientInfo.env) {
    params.client_env = clientInfo.env;
  }

  return params;
}

/**
 * Get client info as query string
 */
export function getClientQueryString(apiUrl: string): string {
  const clientInfo = getClientInfo(apiUrl);
  const params = clientInfoToQueryParams(clientInfo);

  return new URLSearchParams(params).toString();
}
