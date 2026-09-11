import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import type { LookupFunction } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent, fetch as undiciFetch } from "undici";

const MAX_REDIRECTS = 5;

export class TrustedHttpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrustedHttpError";
  }
}

export type ResolvedAddress = {
  readonly address: string;
  readonly family: 4 | 6;
};

export type UrlPolicy = {
  readonly websiteUrl: string;
  readonly domain: string;
  readonly port: string;
  readonly protocols: ReadonlySet<string>;
  readonly origins: ReadonlySet<string>;
};

export type TrustedResponse = {
  readonly status: number;
  readonly url: URL;
  readonly headers: Headers;
  readonly body: Uint8Array;
  readonly transferredBytes?: number;
};

export type TrustedHttp = {
  get(
    url: string,
    policy: UrlPolicy,
    options: { readonly signal: AbortSignal; readonly maxBytes: number },
  ): Promise<TrustedResponse>;
};

export function isPublicAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;
  const parsed = ipaddr.process(address);
  return parsed.range() === "unicast";
}

export function createUrlPolicy(websiteUrl: string): UrlPolicy {
  const url = parsePublicHttpUrl(websiteUrl, "Website URL");
  const domain = url.hostname.replace(/^www\./, "");
  const protocols = new Set([url.protocol]);
  const origins = new Set([url.origin]);
  if (url.protocol === "http:") {
    protocols.add("https:");
    const secureUrl = new URL(url);
    secureUrl.protocol = "https:";
    origins.add(secureUrl.origin);
  }
  return { websiteUrl: url.toString(), domain, port: url.port, protocols, origins };
}

export function assertTrustedUrl(value: string, policy: UrlPolicy): URL {
  const url = parsePublicHttpUrl(value, "URL");
  const sameDomain =
    url.hostname === policy.domain ||
    (!ipaddr.isValid(policy.domain.replace(/^\[|\]$/g, "")) && url.hostname.endsWith(`.${policy.domain}`));
  if (!sameDomain || url.port !== policy.port || !policy.protocols.has(url.protocol)) {
    throw new TrustedHttpError(`URLs must belong to the same website: ${policy.websiteUrl} and ${url}`);
  }
  return url;
}

export function assertTrustedRedirect(value: string, currentValue: string, policy: UrlPolicy): URL {
  const currentUrl = assertTrustedUrl(currentValue, policy);
  const nextUrl = assertTrustedUrl(value, policy);
  if (currentUrl.protocol === "https:" && nextUrl.protocol === "http:") {
    throw new TrustedHttpError("HTTPS redirects must not downgrade to HTTP");
  }
  return nextUrl;
}

function parsePublicHttpUrl(value: string, name: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TrustedHttpError(`${name} is invalid`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TrustedHttpError(`${name} must use public HTTP(S)`);
  }
  if (url.username || url.password) {
    throw new TrustedHttpError(`${name} must not contain credentials`);
  }
  if (ipaddr.isValid(url.hostname.replace(/^\[|\]$/g, "")) && !isPublicAddress(url.hostname.replace(/^\[|\]$/g, ""))) {
    throw new TrustedHttpError(`${name} must use public HTTP(S)`);
  }
  return url;
}

async function readBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    await cancelBody(response);
    throw new TrustedHttpError(`Response exceeds the ${formatMegabytes(maxBytes)} MB size limit`);
  }

  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new TrustedHttpError(`Response exceeds the ${formatMegabytes(maxBytes)} MB size limit`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function formatMegabytes(bytes: number): number {
  return bytes / 1024 / 1024;
}

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Cancellation must not replace the error that caused it.
  }
}

export async function requestPinned(
  url: string,
  addresses: readonly ResolvedAddress[],
  signal: AbortSignal,
  maxBytes: number,
): Promise<TrustedResponse> {
  const first = addresses[0];
  if (!first) throw new TrustedHttpError("The website host did not resolve to an address");

  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    if (typeof options === "object" && options.all) {
      callback(null, [...addresses]);
      return;
    }
    callback(null, first.address, first.family);
  };
  const dispatcher = new Agent({ connect: { lookup: pinnedLookup } });
  try {
    const response = (await undiciFetch(url, { dispatcher, redirect: "manual", signal })) as unknown as Response;
    const body = !isRedirect(response.status)
      ? await readBytes(response, maxBytes)
      : (await cancelBody(response), new Uint8Array());
    return {
      status: response.status,
      url: new URL(url),
      headers: response.headers,
      body,
      transferredBytes: transferredByteLength(response, body),
    };
  } finally {
    await dispatcher.close();
  }
}

function transferredByteLength(response: Response, body: Uint8Array): number {
  const contentLength = Number(response.headers.get("content-length"));
  return Number.isFinite(contentLength) && contentLength >= 0
    ? Math.max(contentLength, body.byteLength)
    : body.byteLength;
}

async function resolvePublicAddresses(hostname: string, signal: AbortSignal): Promise<readonly ResolvedAddress[]> {
  const bareHostname = hostname.replace(/^\[|\]$/g, "");
  if (ipaddr.isValid(bareHostname)) {
    if (!isPublicAddress(bareHostname)) throw new TrustedHttpError("The website host must resolve to public addresses");
    return [{ address: bareHostname, family: ipaddr.parse(bareHostname).kind() === "ipv4" ? 4 : 6 }];
  }

  let addresses: readonly ResolvedAddress[];
  try {
    const resolved = await lookupWithSignal(bareHostname, signal);
    addresses = resolved.flatMap(({ address, family }) => (family === 4 || family === 6 ? [{ address, family }] : []));
  } catch {
    throw new TrustedHttpError("Could not resolve the website host");
  }
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new TrustedHttpError("The website host must resolve to public addresses");
  }
  return addresses;
}

function lookupWithSignal(hostname: string, signal: AbortSignal): Promise<LookupAddress[]> {
  return new Promise<LookupAddress[]>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    lookup(hostname, { all: true, verbatim: true })
      .then(resolve, reject)
      .finally(() => {
        signal.removeEventListener("abort", onAbort);
      });
  });
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

export const trustedHttp: TrustedHttp = {
  async get(url, policy, options) {
    let currentUrl = assertTrustedUrl(url, policy);
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      const addresses = await resolvePublicAddresses(currentUrl.hostname, options.signal);
      const response = await requestPinned(currentUrl.toString(), addresses, options.signal, options.maxBytes);
      if (!isRedirect(response.status)) return response;
      if (redirects === MAX_REDIRECTS) throw new TrustedHttpError("The request redirected too many times");
      const location = response.headers.get("location");
      if (!location) throw new TrustedHttpError("The redirect is missing a location");
      currentUrl = assertTrustedRedirect(new URL(location, currentUrl).toString(), currentUrl.toString(), policy);
    }
    throw new TrustedHttpError("The request redirected too many times");
  },
};
