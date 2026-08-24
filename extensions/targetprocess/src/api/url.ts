import { AuthTransport, TargetprocessError } from "./types";

export const ROW_INCLUDE =
  "[Id,Name,EntityType[Name],EntityState[Name,NumericPriority,IsFinal],Project[Name],ModifyDate]";

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
