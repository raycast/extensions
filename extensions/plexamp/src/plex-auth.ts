import { environment } from "@raycast/api";

import { getClientIdentifier } from "./plex-client";
import { PLEX_TV_BASE_URL, requirePlexToken } from "./plex-config";
import { arrayify, asBoolean, asString, requiredString, type XmlNode } from "./plex-parsing";
import { requestJson, requestXml } from "./plex-request";
import type { PlexAuthPin, PlexServerConnection, PlexServerResource } from "./types";

function isIpv4LanAddress(address: string): boolean {
  const octets = address.split(".").map((value) => Number.parseInt(value, 10));

  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function isIpv6LanAddress(address: string): boolean {
  const normalized = address.toLowerCase();

  return (
    normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")
  );
}

function isLanAddress(address?: string): boolean {
  if (!address) {
    return false;
  }

  const normalized = address
    .trim()
    .replace(/^\[(.*)\]$/, "$1")
    .toLowerCase();

  if (!normalized) {
    return false;
  }

  return (
    normalized === "localhost" ||
    normalized.endsWith(".local") ||
    isIpv4LanAddress(normalized) ||
    isIpv6LanAddress(normalized)
  );
}

interface PlexPinResponse {
  id: number | string;
  code: string;
  authToken?: string;
  expiresIn?: number;
}

function buildPlexAuthUrl(code: string, clientIdentifier: string): string {
  const url = new URL("https://app.plex.tv/auth");
  const params = new URLSearchParams({
    clientID: clientIdentifier,
    code,
    forwardUrl: "https://app.plex.tv/desktop",
  });
  params.set("context[device][product]", environment.extensionName ?? "Raycast Plexamp");
  url.hash = `?${params.toString()}`;

  return url.toString();
}

function parsePlexServerConnection(node: XmlNode): PlexServerConnection {
  const address = asString(node.address);

  return {
    uri: requiredString(node.uri, "uri"),
    address,
    port: asString(node.port),
    protocol: asString(node.protocol),
    local: asBoolean(node.local),
    localNetwork: isLanAddress(address),
    relay: asBoolean(node.relay),
  };
}

function connectionRank(connection: PlexServerConnection): number {
  return [connection.relay ? 100 : 0, connection.localNetwork ? 0 : 10, connection.protocol === "https" ? 0 : 1].reduce(
    (sum, value) => sum + value,
    0,
  );
}

function choosePreferredConnection(connections: PlexServerConnection[]): PlexServerConnection | undefined {
  return [...connections].sort((left, right) => {
    const rankDifference = connectionRank(left) - connectionRank(right);

    if (rankDifference !== 0) {
      return rankDifference;
    }

    return left.uri.localeCompare(right.uri);
  })[0];
}

function parsePlexServerResource(node: XmlNode, fallbackToken: string): PlexServerResource | undefined {
  const provides = asString(node.provides) ?? "";

  if (
    !provides
      .split(",")
      .map((value) => value.trim())
      .includes("server")
  ) {
    return undefined;
  }

  const connections = arrayify(node.Connection)
    .filter((connection): connection is XmlNode => typeof connection === "object")
    .map(parsePlexServerConnection);

  if (connections.length === 0) {
    return undefined;
  }

  return {
    name: asString(node.name) ?? asString(node.clientIdentifier) ?? "Plex Media Server",
    product: asString(node.product),
    productVersion: asString(node.productVersion),
    platform: asString(node.platform),
    clientIdentifier: requiredString(node.clientIdentifier, "clientIdentifier"),
    accessToken: asString(node.accessToken) ?? fallbackToken,
    sourceTitle: asString(node.sourceTitle),
    owned: asBoolean(node.owned),
    connections,
    preferredConnection: choosePreferredConnection(connections),
  };
}

export async function createPlexAuthPin(): Promise<PlexAuthPin> {
  const clientIdentifier = await getClientIdentifier();
  const response = await requestJson<PlexPinResponse>(PLEX_TV_BASE_URL, "/api/v2/pins", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "strong=true",
  });

  return {
    id: String(response.id),
    code: response.code,
    authUrl: buildPlexAuthUrl(response.code, clientIdentifier),
    expiresIn: response.expiresIn,
  };
}

export async function checkPlexAuthPin(pin: PlexAuthPin): Promise<string | undefined> {
  const response = await requestJson<PlexPinResponse>(
    PLEX_TV_BASE_URL,
    `/api/v2/pins/${encodeURIComponent(pin.id)}?code=${encodeURIComponent(pin.code)}`,
    undefined,
  );

  return response.authToken;
}

export async function discoverPlexServers(): Promise<PlexServerResource[]> {
  const token = await requirePlexToken();
  const container = await requestXml(
    PLEX_TV_BASE_URL,
    "/api/resources?includeHttps=1&includeIPv6=1",
    undefined,
    true,
    token,
  );

  return arrayify(container.Device)
    .filter((node): node is XmlNode => typeof node === "object")
    .map((node) => parsePlexServerResource(node, token))
    .filter((server): server is PlexServerResource => Boolean(server));
}
