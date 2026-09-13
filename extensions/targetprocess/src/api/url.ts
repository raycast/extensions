import { AuthTransport, TargetprocessError } from "./types";

export const ROW_INCLUDE =
  "[Id,Name,EntityType[Name],EntityState[Name,NumericPriority,IsFinal],Project[Name],ModifyDate]";

/** Hostnames that cannot resolve outside the machine or its local network. */
const LOCAL_SUFFIXES = [".local", ".internal", ".lan", ".home.arpa", ".localdomain"];

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host === "::1") return true;
  if (LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  // A bare hostname with no dots can only be resolved locally.
  if (!host.includes(".") && !host.includes(":")) return true;
  // IPv6 unique-local (fc00::/7).
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!ipv4) return false;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  if (a === 127 || a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/**
 * Personal access tokens travel in a header or, on most instances, the query string. Over http that
 * is readable by anything on the path, so plain http is allowed only where the traffic cannot leave
 * a private network.
 */
export function assertSecureTransport(url: URL): void {
  if (url.protocol === "https:") return;
  if (isPrivateHost(url.hostname)) return;

  throw new TargetprocessError(
    "insecure-transport",
    `Use https:// for ${url.hostname}. Plain http would send your access token in clear text.`,
  );
}

/** Preserves any path prefix, so on-premise installs at https://host/TargetProcess keep working. */
export function normaliseBaseUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new TargetprocessError("not-targetprocess", "Enter the URL of your Targetprocess instance.");
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch (cause) {
    throw new TargetprocessError("not-targetprocess", `"${input}" is not a valid URL.`, undefined, { cause });
  }

  if (url.hostname.length === 0) {
    throw new TargetprocessError("not-targetprocess", `"${input}" is not a valid URL.`);
  }

  assertSecureTransport(url);

  const path = url.pathname.replace(/\/+$/, "").replace(/\/api\/v[12]$/i, "");

  return `${url.protocol}//${url.host}${path}`;
}

/** Targetprocess redirects this to the right board page per type, so there is no per-type mapping. */
export function entityUrl(baseUrl: string, id: number): string {
  return `${normaliseBaseUrl(baseUrl)}/entity/${id}`;
}

export type QueryValue = string | number | boolean | undefined;

export function apiUrl(baseUrl: string, path: string, params: Record<string, QueryValue> = {}): URL {
  const url = new URL(`${normaliseBaseUrl(baseUrl)}/${path.replace(/^\/+/, "")}`);
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

export function applyAuth(url: URL, headers: Headers, token: string, transport: AuthTransport): void {
  switch (transport) {
    case "bearer":
      headers.set("Authorization", `Bearer ${token}`);
      break;
    case "basic":
      headers.set("Authorization", `Basic ${Buffer.from(`${token}:`).toString("base64")}`);
      break;
    case "query":
      url.searchParams.set("access_token", token);
      break;
  }
}

/**
 * encodeURIComponent is not enough: URLSearchParams form-encodes, so a space becomes "+" rather
 * than "%20", and a token containing one would survive redaction inside a URL.
 */
function tokenVariants(token: string): string[] {
  const variants = new Set([token, encodeURIComponent(token), new URLSearchParams([["v", token]]).toString().slice(2)]);
  return [...variants].sort((a, b) => b.length - a.length);
}

export function redact(text: string, token: string): string {
  if (token.length === 0) return text;
  return tokenVariants(token).reduce((result, variant) => result.split(variant).join("<token>"), text);
}
