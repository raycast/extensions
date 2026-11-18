import { randomUUID } from "node:crypto";

export interface UrlParameter {
  id: string;
  key: string;
  value: string;
  raw?: string;
}

export interface ParsedUrl {
  prefix: string;
  fragment: string;
  hasQuery: boolean;
  parameters: UrlParameter[];
}

export interface NestedUrl {
  url: ParsedUrl;
  encodingLayers: number;
}

export interface UrlComponents {
  protocol: string;
  hostname: string;
  port: string;
  path: string;
  fragment: string;
}

export type UrlComponent = keyof UrlComponents;

interface PrefixParts {
  protocol: string;
  hasAuthority: boolean;
  credentials: string;
  hostname: string;
  port: string;
  hasPort: boolean;
  path: string;
}

function splitPrefix(prefix: string): PrefixParts {
  const colon = prefix.indexOf(":");
  const protocol = prefix.slice(0, colon + 1);
  const rest = prefix.slice(colon + 1);
  if (!rest.startsWith("//")) {
    return { protocol, hasAuthority: false, credentials: "", hostname: "", port: "", hasPort: false, path: rest };
  }

  const slash = rest.slice(2).search(/[/\\]/);
  const authority = slash < 0 ? rest.slice(2) : rest.slice(2, slash + 2);
  const path = slash < 0 ? "" : rest.slice(slash + 2);
  const at = authority.lastIndexOf("@");
  const credentials = at < 0 ? "" : authority.slice(0, at + 1);
  const host = authority.slice(at + 1);
  const portColon = host.startsWith("[") ? host.indexOf(":", host.indexOf("]")) : host.lastIndexOf(":");
  return {
    protocol,
    hasAuthority: true,
    credentials,
    hostname: portColon < 0 ? host : host.slice(0, portColon),
    port: portColon < 0 ? "" : host.slice(portColon + 1),
    hasPort: portColon >= 0,
    path,
  };
}

export function readUrlComponents(url: ParsedUrl): UrlComponents {
  const { protocol, hostname, port, path } = splitPrefix(url.prefix);
  return { protocol, hostname, port, path, fragment: url.fragment };
}

export function updateUrlComponent(url: ParsedUrl, component: UrlComponent, input: string): ParsedUrl {
  const parts = splitPrefix(url.prefix);
  let fragment = url.fragment;

  switch (component) {
    case "protocol": {
      const protocol = input.trim().replace(/:$/, "");
      if (!/^[a-z][a-z\d+.-]*$/i.test(protocol))
        throw new Error("Enter a valid protocol name, such as https or myapp.");
      parts.protocol = `${protocol}:`;
      break;
    }
    case "hostname": {
      const hostname = input.trim();
      if (/[/?#@\\\s]/.test(hostname) || (hostname.includes(":") && !/^\[[^\]]+\]$/.test(hostname))) {
        throw new Error("Enter a hostname or an IPv6 address in brackets. Edit the port in the Port field.");
      }
      parts.hostname = hostname;
      if (hostname && !parts.hasAuthority) {
        parts.hasAuthority = true;
        if (parts.path && !parts.path.startsWith("/")) parts.path = `/${parts.path}`;
      }
      break;
    }
    case "port": {
      const port = input.trim();
      if (port && (!/^\d+$/.test(port) || Number(port) > 65535))
        throw new Error("Enter an integer from 0 to 65535, or leave the port empty.");
      if (port && !parts.hasAuthority) throw new Error("A port cannot be set on a URL without a hostname.");
      parts.port = port;
      parts.hasPort = Boolean(port);
      break;
    }
    case "path": {
      if (input === parts.path) return url;
      if (!input) {
        parts.path = "";
      } else {
        // A neutral URL encodes path delimiters and Unicode even for opaque custom schemes.
        const encoder = new URL("https://example.com");
        encoder.pathname = input;
        parts.path = !parts.hasAuthority && !input.startsWith("/") ? encoder.pathname.slice(1) : encoder.pathname;
      }
      break;
    }
    case "fragment": {
      if (input === fragment) return url;
      if (!input || input === "#") {
        fragment = input;
      } else {
        const encoder = new URL("https://example.com");
        encoder.hash = input;
        fragment = encoder.hash;
      }
      break;
    }
  }

  if (parts.hasAuthority && /^(https?|wss?|ftp):$/i.test(parts.protocol) && !parts.hostname) {
    throw new Error("This protocol requires a hostname. The Hostname field cannot be empty.");
  }
  const authority = parts.hasAuthority
    ? `//${parts.credentials}${parts.hostname}${parts.hasPort ? `:${parts.port}` : ""}`
    : "";
  const updated = { ...url, prefix: `${parts.protocol}${authority}${parts.path}`, fragment };
  // Validate the assembled URL without normalizing any of its unchanged components or query parameters.
  parseUrl(serializeUrl(updated));
  return updated;
}

function decodeQueryPart(value: string): string {
  const spaces = value.replace(/\+/g, " ");
  try {
    return decodeURIComponent(spaces);
  } catch {
    // Keep malformed escapes readable without losing the original raw parameter.
    return spaces;
  }
}

export function parseUrl(input: string): ParsedUrl {
  const text = input.trim();
  if (!/^[a-z][a-z\d+.-]*:/i.test(text)) {
    throw new Error("Enter a complete URL including its protocol, such as https://example.com or myapp://page.");
  }
  try {
    new URL(text);
  } catch {
    throw new Error("Invalid URL. Check the protocol, hostname, and port.");
  }
  const hashIndex = text.indexOf("#");
  const beforeHash = hashIndex < 0 ? text : text.slice(0, hashIndex);
  const fragment = hashIndex < 0 ? "" : text.slice(hashIndex);
  const queryIndex = beforeHash.indexOf("?");
  const query = queryIndex < 0 ? "" : beforeHash.slice(queryIndex + 1);

  return {
    prefix: queryIndex < 0 ? beforeHash : beforeHash.slice(0, queryIndex),
    fragment,
    hasQuery: queryIndex >= 0,
    parameters: query
      ? query.split("&").map((raw) => {
          const equals = raw.indexOf("=");
          return {
            id: randomUUID(),
            key: decodeQueryPart(equals < 0 ? raw : raw.slice(0, equals)),
            value: decodeQueryPart(equals < 0 ? "" : raw.slice(equals + 1)),
            raw,
          };
        })
      : [],
  };
}

export function serializeQuery(url: ParsedUrl): string {
  return url.parameters
    .map((parameter) => parameter.raw ?? new URLSearchParams([[parameter.key, parameter.value]]).toString())
    .join("&");
}

export function serializeUrl(url: ParsedUrl): string {
  const query = serializeQuery(url);
  return `${url.prefix}${url.hasQuery || url.parameters.length ? `?${query}` : ""}${url.fragment}`;
}

export function updateParameter(url: ParsedUrl, id: string, key: string, value: string): ParsedUrl {
  return {
    ...url,
    parameters: url.parameters.map((parameter) =>
      parameter.id === id && (parameter.key !== key || parameter.value !== value) ? { id, key, value } : parameter,
    ),
  };
}

export function addParameter(url: ParsedUrl, key: string, value: string): ParsedUrl {
  return { ...url, hasQuery: true, parameters: [...url.parameters, { id: randomUUID(), key, value }] };
}

export function removeParameter(url: ParsedUrl, id: string): ParsedUrl {
  const parameters = url.parameters.filter((parameter) => parameter.id !== id);
  return { ...url, parameters, hasQuery: parameters.length > 0 };
}

export function findNestedUrl(value: string, maxEncodingLayers = 5): NestedUrl | undefined {
  let decoded = value;
  for (let encodingLayers = 0; encodingLayers <= maxEncodingLayers; encodingLayers++) {
    try {
      return { url: parseUrl(decoded), encodingLayers };
    } catch {
      // A nested URL may have been percent-encoded more than once.
    }
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) return undefined;
      decoded = next;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function encodeNestedUrl(url: ParsedUrl, encodingLayers: number): string {
  let result = serializeUrl(url);
  for (let layer = 0; layer < encodingLayers; layer++) result = encodeURIComponent(result);
  return result;
}
