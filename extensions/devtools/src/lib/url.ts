import { randomUUID } from "node:crypto";

export interface UrlParameter {
  id: string;
  key: string;
  value: string;
}

export interface ParsedUrl {
  value: URL;
  parameters: UrlParameter[];
}

export interface NestedUrl {
  url: ParsedUrl;
  encodingLayers: number;
}

export type UrlComponent = "protocol" | "hostname" | "port" | "pathname" | "hash";

export function parseUrl(input: string): ParsedUrl {
  const value = URL.parse(input.trim());
  if (!value) throw new Error("Enter a valid, complete URL, such as https://example.com or myapp://page.");
  return {
    value,
    parameters: Array.from(value.searchParams, ([key, value]) => ({ id: randomUUID(), key, value })),
  };
}

export function updateUrlComponent(url: ParsedUrl, component: UrlComponent, input: string): ParsedUrl {
  let value = new URL(url.value);
  const text = input.trim();

  // URL setters can ignore invalid inputs without throwing. Check field boundaries
  // and compare with the native parser so the form can report rejected edits.
  switch (component) {
    case "protocol": {
      const protocol = `${text.replace(/:$/, "").toLowerCase()}:`;
      if (!/^[a-z][a-z\d+.-]*:$/i.test(protocol)) throw new Error("Enter a protocol name, such as https or myapp.");
      value = new URL(`${protocol}${value.href.slice(value.protocol.length)}`);
      break;
    }
    case "hostname": {
      if (/[/?#@\\\s]/.test(text) || (text.includes(":") && !/^\[[^\]]+\]$/.test(text))) {
        throw new Error("Enter a hostname or an IPv6 address in brackets. Edit the port in the Port field.");
      }
      const expected = new URL(`${value.protocol}//${text}/`).hostname;
      value.hostname = text;
      if (value.hostname !== expected) throw new Error("The hostname cannot be changed for this URL.");
      break;
    }
    case "port": {
      if (!/^\d*$/.test(text)) throw new Error("Enter a numeric port, or leave the port empty.");
      const expected = new URL(`${value.protocol}//example.com${text ? `:${text}` : ""}/`).port;
      value.port = text;
      if (value.port !== expected) throw new Error("A port cannot be set on this URL.");
      break;
    }
    case "pathname": {
      const probe = new URL(value);
      probe.pathname = "/";
      if (probe.pathname !== "/" && input !== value.pathname) {
        throw new Error("Opaque paths, such as mailto addresses, cannot be edited with the URL API.");
      }
      value.pathname = input;
      break;
    }
    case "hash":
      value.hash = input;
      break;
  }
  return { ...url, value };
}

function replaceParameters(url: ParsedUrl, parameters: UrlParameter[]): ParsedUrl {
  const value = new URL(url.value);
  value.search = new URLSearchParams(parameters.map(({ key, value }) => [key, value])).toString();
  return { value, parameters };
}

export function updateParameter(url: ParsedUrl, id: string, key: string, value: string): ParsedUrl {
  const parameter = url.parameters.find((item) => item.id === id);
  if (!parameter || (parameter.key === key && parameter.value === value)) return url;
  return replaceParameters(
    url,
    url.parameters.map((item) => (item.id === id ? { id, key, value } : item)),
  );
}

export function addParameter(url: ParsedUrl, key: string, value: string): ParsedUrl {
  return replaceParameters(url, [...url.parameters, { id: randomUUID(), key, value }]);
}

export function removeParameter(url: ParsedUrl, id: string): ParsedUrl {
  return replaceParameters(
    url,
    url.parameters.filter((item) => item.id !== id),
  );
}

export function findNestedUrl(value: string, maxEncodingLayers = 5): NestedUrl | undefined {
  let decoded = value;
  for (let encodingLayers = 0; encodingLayers <= maxEncodingLayers; encodingLayers++) {
    if (URL.canParse(decoded)) return { url: parseUrl(decoded), encodingLayers };
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
  let result = url.value.href;
  for (let layer = 0; layer < encodingLayers; layer++) result = encodeURIComponent(result);
  return result;
}
