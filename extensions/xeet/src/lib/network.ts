import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import type { LookupFunction } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent, fetch, type Dispatcher } from "undici";
import type { Host } from "@xeet/core";

const ALLOWED_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "api.x.com",
  "api.twitter.com",
  "pbs.twimg.com",
  "abs.twimg.com",
  "video.twimg.com",
]);
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 48 * 1024 * 1024;

export function isPublicAddress(address: string): boolean {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}

export function validateRemoteUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.port || url.username || url.password || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error("Blocked a request outside public X and its media hosts.");
  }
  return url;
}

async function publicLookup(hostname: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const addresses = await new Promise<LookupAddress[]>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    void lookup(hostname, { all: true, verbatim: true })
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address)))
    throw new Error("Blocked a private or local network address.");
  return addresses;
}

export function createNetworkHost(
  signal: AbortSignal,
  transport?: Dispatcher,
): { host: Host; close: () => Promise<void> } {
  // Validate DNS at connection time too, preventing a second DNS lookup from
  // redirecting a previously checked host to a private address.
  const safeLookup: LookupFunction = (hostname, options, callback) => {
    void publicLookup(hostname, signal).then(
      (addresses) => {
        const family = typeof options === "number" ? options : options.family;
        const selected = addresses.filter((entry) => !family || entry.family === family);
        if (!selected.length) {
          callback(new Error("No public address available"), "", 4);
          return;
        }
        if (typeof options === "object" && options.all) callback(null, selected);
        else callback(null, selected[0].address, selected[0].family);
      },
      (error: Error) => callback(error, "", 4),
    );
  };
  const agent = transport || new Agent({ connect: { lookup: safeLookup }, headersTimeout: 8_000, bodyTimeout: 8_000 });
  let requests = 0;
  let redirects = 0;
  let downloaded = 0;
  return {
    close: () => (transport ? transport.close() : agent.destroy()),
    host: {
      lookup: async (hostname) => (await publicLookup(hostname, signal)).map(({ address }) => address),
      async fetch(request) {
        signal.throwIfAborted();
        const url = validateRemoteUrl(request.url);
        if (++requests > 30) throw new Error("Post resolution exceeded its request limit.");
        const timeout = 8_000;
        const response = await fetch(url, {
          method: "GET",
          headers: request.headers,
          redirect: "manual",
          dispatcher: agent,
          signal: AbortSignal.any([signal, AbortSignal.timeout(timeout)]),
        });
        if (response.status >= 300 && response.status < 400 && ++redirects > 5) {
          await response.body?.cancel();
          throw new Error("Post resolution exceeded its redirect limit.");
        }
        const limit = Math.min(request.maxBytes ?? MAX_RESPONSE_BYTES, MAX_RESPONSE_BYTES);
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          for await (const chunk of response.body ?? []) {
            size += chunk.byteLength;
            downloaded += chunk.byteLength;
            if (size > limit || downloaded > MAX_TOTAL_BYTES)
              throw new Error("X returned an image or page larger than the download limit.");
            chunks.push(chunk);
          }
        } catch (error) {
          await response.body?.cancel().catch(() => undefined);
          throw error;
        }
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers),
          body: Buffer.concat(chunks),
          truncated: false,
        };
      },
    },
  };
}
