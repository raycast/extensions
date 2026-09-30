import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { Readable, Transform } from "node:stream";
import zlib from "node:zlib";

// Reads a web page for the chat and the AI tools without ever touching the
// local network. Raycast AI can call `read-link` with any URL — including one a
// malicious page put in front of it — so a link to a router, a NAS or a service
// on this Mac must not be read back into the conversation. Every hop (the first
// request and each redirect) is checked before connecting: the host name, then
// every address it resolves to, and the socket then connects to the address
// that was checked, so a DNS answer that changes in between (rebinding) can't
// slip through.

/** Thrown when a link points at a local or private network address. */
export class BlockedAddressError extends Error {
  constructor(host: string) {
    super(`Won't read ${host}: it's a local or private network address.`);
    this.name = "BlockedAddressError";
  }
}

/** The server answered with an error status. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly host: string,
  ) {
    super(`HTTP ${status} from ${host}`);
    this.name = "HttpError";
  }
}

const BLOCKED = new net.BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], // "this network", unspecified
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (and cloud metadata services)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
] as const) {
  BLOCKED.addSubnet(address, prefix, "ipv4");
}
for (const [address, prefix] of [
  ["::", 96], // unspecified, loopback, IPv4-compatible
  ["100::", 64], // discard
  ["2001:db8::", 32], // documentation
  ["fc00::", 7], // unique local (private)
  ["fe80::", 10], // link-local
  ["fec0::", 10], // site-local (deprecated)
  ["ff00::", 8], // multicast
] as const) {
  BLOCKED.addSubnet(address, prefix, "ipv6");
}

/** The eight 16-bit groups of an IPv6 address, or undefined when it isn't one. */
function ipv6Groups(ip: string): number[] | undefined {
  let text = ip.toLowerCase();
  // A trailing dotted IPv4 (`::ffff:1.2.3.4`) is the last two groups.
  const dotted = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (dotted) {
    const [a, b, c, d] = dotted.slice(1).map(Number);
    text = `${text.slice(0, dotted.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return undefined;
  const parse = (part: string) => (part ? part.split(":").map((g) => parseInt(g, 16)) : []);
  const left = parse(halves[0]);
  const right = halves.length === 2 ? parse(halves[1]) : [];
  const fill = halves.length === 2 ? 8 - left.length - right.length : 0;
  if (fill < 0) return undefined;
  const groups = [...left, ...Array<number>(fill).fill(0), ...right];
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : undefined;
}

/**
 * The IPv4 address inside an IPv4-mapped (`::ffff:a.b.c.d`) or NAT64
 * (`64:ff9b::a.b.c.d`) IPv6 address — those reach the IPv4 host, so they're
 * judged by it.
 */
function embeddedIpv4(ip: string): string | undefined {
  const g = ipv6Groups(ip);
  if (!g) return undefined;
  const mapped = g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff;
  const nat64 = g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0);
  if (!mapped && !nat64) return undefined;
  return [g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff].join(".");
}

/** True for loopback, private, link-local, CGNAT, unspecified, multicast and reserved addresses (and non-addresses). */
export function isBlockedAddress(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return BLOCKED.check(ip, "ipv4");
  if (version === 6) {
    const v4 = embeddedIpv4(ip);
    return v4 ? BLOCKED.check(v4, "ipv4") : BLOCKED.check(ip, "ipv6");
  }
  return true;
}

const LOCAL_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];

/** Names that only mean something on the local network: `localhost`, `*.local`, `*.internal`, … */
export function isBlockedHostname(host: string): boolean {
  const name = host.toLowerCase().replace(/\.$/, "");
  return name === "localhost" || LOCAL_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

export type Resolver = (host: string) => Promise<{ address: string; family: 4 | 6 }[]>;

export type SafeFetchOptions = {
  signal?: AbortSignal;
  /** For the whole request, redirects included. Default 15 s. */
  timeoutMs?: number;
  /** Largest body to read, after decompression. Default 5 MB. */
  maxBytes?: number;
  maxRedirects?: number;
  /** Content types to accept, e.g. `text/html` or `image/` (a prefix). Anything when omitted. */
  accept?: string[];
  /** For tests: how names resolve. Defaults to the system resolver. */
  resolve?: Resolver;
  /** For tests: which resolved addresses may be reached. Defaults to anything `isBlockedAddress` allows. */
  allowAddress?: (ip: string) => boolean;
};

export type SafeResponse = { url: string; status: number; contentType: string; body: Buffer };

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 5;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

const systemResolve: Resolver = async (host) =>
  (await dns.promises.lookup(host, { all: true, verbatim: true })).map((a) => ({
    address: a.address,
    family: a.family === 6 ? 6 : 4,
  }));

function abortError(): Error {
  return Object.assign(new Error("The request was stopped."), { name: "AbortError" });
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024))} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

/** The address to connect to, after checking the host name and everything it resolves to. */
async function checkedAddress(
  host: string,
  resolve: Resolver,
  allow: (ip: string) => boolean,
): Promise<{ address: string; family: 4 | 6 }> {
  if (isBlockedHostname(host)) throw new BlockedAddressError(host);
  const literal = net.isIP(host);
  if (literal) {
    if (!allow(host)) throw new BlockedAddressError(host);
    return { address: host, family: literal === 6 ? 6 : 4 };
  }
  const addresses = await resolve(host);
  if (addresses.length === 0) throw new Error(`Couldn't find ${host}.`);
  // One private answer is enough to refuse: a rebinding name mixes both.
  if (addresses.some((a) => !allow(a.address))) throw new BlockedAddressError(host);
  return addresses[0];
}

function decoder(encoding: string | undefined): Transform | undefined {
  switch ((encoding ?? "").trim().toLowerCase()) {
    case "gzip":
    case "x-gzip":
      return zlib.createGunzip();
    case "deflate":
      return zlib.createInflate();
    case "br":
      return zlib.createBrotliDecompress();
    default:
      return undefined;
  }
}

type Hop = { status: number; location?: string; contentType: string; response: http.IncomingMessage };

function request(url: URL, target: { address: string; family: 4 | 6 }, accept: string, signal: AbortSignal) {
  const client = url.protocol === "https:" ? https : http;
  return new Promise<Hop>((resolve, reject) => {
    const req = client.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: {
          "user-agent": USER_AGENT,
          accept,
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "en;q=0.9, *;q=0.5",
        },
        // Connect to the address that was checked — never a fresh lookup.
        lookup: (_host, options, callback) => {
          if (options.all) callback(null, [target]);
          else callback(null, target.address, target.family);
        },
        signal,
      },
      (response) =>
        resolve({
          status: response.statusCode ?? 0,
          location: response.headers.location,
          contentType: String(response.headers["content-type"] ?? ""),
          response,
        }),
    );
    req.on("error", reject);
    req.end();
  });
}

async function readBody(hop: Hop, maxBytes: number, signal: AbortSignal): Promise<Buffer> {
  const unzip = decoder(hop.response.headers["content-encoding"]);
  const stream: Readable = unzip ? hop.response.pipe(unzip) : hop.response;
  if (unzip) hop.response.on("error", (error) => unzip.destroy(error));
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of stream) {
      if (signal.aborted) throw abortError();
      size += (chunk as Buffer).length;
      if (size > maxBytes) throw new Error(`The page is larger than ${formatSize(maxBytes)}.`);
      chunks.push(chunk as Buffer);
    }
  } finally {
    hop.response.destroy();
    unzip?.destroy();
  }
  return Buffer.concat(chunks);
}

/**
 * GET `url` without reaching the local network: http(s) only, every hop
 * checked, redirects followed by hand, the body decompressed and capped.
 */
export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<SafeResponse> {
  const resolve = options.resolve ?? systemResolve;
  const allow = options.allowAddress ?? ((ip: string) => !isBlockedAddress(ip));
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const acceptHeader = options.accept?.length
    ? `${options.accept.map((a) => (a.endsWith("/") ? `${a}*` : a)).join(", ")}, */*;q=0.1`
    : "*/*";

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const stop = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener("abort", stop);

  try {
    let current = new URL(url);
    for (let redirects = 0; ; redirects++) {
      if (current.protocol !== "http:" && current.protocol !== "https:") {
        throw new Error("Only http and https links can be read.");
      }
      const host = current.hostname.replace(/^\[|\]$/g, "");
      const target = await checkedAddress(host, resolve, allow);
      if (controller.signal.aborted) throw abortError();
      const hop = await request(current, target, acceptHeader, controller.signal);

      if (hop.status >= 300 && hop.status < 400 && hop.location) {
        hop.response.resume();
        if (redirects >= maxRedirects) throw new Error("The link redirects too many times.");
        current = new URL(hop.location, current);
        continue;
      }
      if (hop.status >= 400 || hop.status < 200) {
        hop.response.resume();
        throw new HttpError(hop.status, host);
      }
      const type = hop.contentType.split(";")[0].trim().toLowerCase();
      if (options.accept?.length && !options.accept.some((a) => (a.endsWith("/") ? type.startsWith(a) : type === a))) {
        hop.response.resume();
        throw new Error(`This link isn't a web page (${type || "unknown type"}).`);
      }
      const body = await readBody(hop, options.maxBytes ?? DEFAULT_MAX_BYTES, controller.signal);
      return { url: current.toString(), status: hop.status, contentType: hop.contentType, body };
    }
  } catch (error) {
    if (timedOut) throw new Error("The page took too long to load.");
    if (options.signal?.aborted) throw abortError();
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", stop);
  }
}
