/**
 * Minimal eSCL (Apple AirScan / Mopria) client for simplex-ADF network scanners.
 *
 * eSCL is plain HTTP + XML. The only non-obvious requirement: the ScanSettings
 * body MUST be a single line with no whitespace between tags, sent as
 * `application/xml`. Brother's embedded parser silently rejects pretty-printed
 * XML and falls back to its defaults (platen glass, JPEG, 200 dpi) while still
 * returning `201 Created` — so it fails invisibly. Keep this compact.
 */
import { spawn } from "node:child_process";
import { lookup } from "node:dns/promises";
import { Bonjour, type Service } from "bonjour-service";
import { debug } from "./util";

export interface Scanner {
  /** Base eSCL URL, e.g. `http://192.168.0.5/eSCL` (no trailing slash). */
  base: string;
  name?: string;
}

export interface ScanOptions {
  /** DPI, e.g. 300. */
  resolution: number;
  /** eSCL color mode: RGB24 | Grayscale8 | BlackAndWhite1. */
  colorMode: string;
}

export type AdfState = "loaded" | "empty" | "unknown";

// A4 scan region in 1/300-inch units.
const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;

function scanSettings(opts: ScanOptions): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<scan:ScanSettings xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm"' +
    ' xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03">' +
    "<pwg:Version>2.6</pwg:Version>" +
    "<pwg:ScanRegions><pwg:ScanRegion>" +
    "<pwg:XOffset>0</pwg:XOffset><pwg:YOffset>0</pwg:YOffset>" +
    `<pwg:Width>${A4_WIDTH}</pwg:Width><pwg:Height>${A4_HEIGHT}</pwg:Height>` +
    "<pwg:ContentRegionUnits>escl:ThreeHundredthsOfInches</pwg:ContentRegionUnits>" +
    "</pwg:ScanRegion></pwg:ScanRegions>" +
    "<pwg:InputSource>Feeder</pwg:InputSource>" +
    `<scan:ColorMode>${opts.colorMode}</scan:ColorMode>` +
    `<scan:XResolution>${opts.resolution}</scan:XResolution>` +
    `<scan:YResolution>${opts.resolution}</scan:YResolution>` +
    "<pwg:DocumentFormat>image/jpeg</pwg:DocumentFormat>" +
    "</scan:ScanSettings>"
  );
}

/** Normalize a user-entered host/IP/URL into an eSCL base URL. */
export function baseFromHost(host: string): string {
  let h = host.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(h)) h = `http://${h}`;
  if (!/\/eSCL$/i.test(h)) h = `${h}/eSCL`;
  return h;
}

/**
 * Resolve a scanner: use the given host if set, otherwise discover the first
 * eSCL device on the network via Bonjour (`_uscan._tcp`).
 */
export async function discoverScanner(host: string | undefined, signal: AbortSignal): Promise<Scanner> {
  debug("discoverScanner: host preference =", JSON.stringify(host));
  if (host && host.trim()) {
    const scanner = { base: baseFromHost(host) };
    debug("discoverScanner: using host preference ->", scanner.base);
    return scanner;
  }
  // Prefer the macOS system mDNS resolver (`dns-sd`): it runs inside
  // mDNSResponder, which already holds Local Network permission. In-process
  // multicast (bonjour-service) is unreliable inside Raycast's sandbox, so it
  // is only a fallback.
  try {
    debug("discoverScanner: trying dns-sd…");
    const scanner = await discoverViaDnsSd(signal);
    debug("discoverScanner: dns-sd ->", scanner.base);
    return scanner;
  } catch (e) {
    debug("discoverScanner: dns-sd failed:", e instanceof Error ? e.message : e);
    if (signal.aborted) throw e;
  }
  debug("discoverScanner: falling back to bonjour…");
  const scanner = await discoverViaBonjour(signal);
  debug("discoverScanner: bonjour ->", scanner.base);
  return scanner;
}

const DNS_SD = "/usr/bin/dns-sd";

/** Run `dns-sd`, scanning stdout line-by-line until `match` returns a value. */
function dnsSd<T>(
  args: string[],
  match: (line: string) => T | undefined,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const child = spawn(DNS_SD, args);
    let buffer = "";
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      try {
        child.kill("SIGKILL");
      } catch {
        // already exited
      }
      action();
    };
    const onAbort = () => finish(() => reject(new Error("Cancelled.")));
    const timer = setTimeout(() => finish(() => reject(new Error("dns-sd timed out."))), timeoutMs);
    signal.addEventListener("abort", onAbort);
    child.on("error", (err) => finish(() => reject(err)));
    child.on("close", () => finish(() => reject(new Error("dns-sd exited without a match."))));
    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const result = match(line);
        if (result !== undefined) {
          finish(() => resolve(result));
          return;
        }
      }
    });
  });
}

async function discoverViaDnsSd(signal: AbortSignal): Promise<Scanner> {
  // 1) Browse for the first eSCL service instance.
  const instance = await dnsSd(
    ["-B", "_uscan._tcp"],
    (line) => {
      const m = /\bAdd\b.*_uscan\._tcp\.\s+(.+?)\s*$/.exec(line);
      return m ? m[1] : undefined;
    },
    5000,
    signal,
  );
  // 2) Resolve it to a host and port.
  const resolved = await dnsSd(
    ["-L", instance, "_uscan._tcp"],
    (line) => {
      const m = /can be reached at\s+(\S+?)\.?:(\d+)/.exec(line);
      return m ? { host: m[1], port: m[2] } : undefined;
    },
    5000,
    signal,
  );
  // 3) Resolve the `.local` host to an IPv4 via the system resolver.
  let address = resolved.host;
  try {
    const { address: ip } = await lookup(resolved.host, { family: 4 });
    if (ip) address = ip;
  } catch {
    // fall back to the .local host if it can't be resolved to an IP
  }
  return { base: `http://${address}:${resolved.port}/eSCL`, name: instance };
}

function discoverViaBonjour(signal: AbortSignal): Promise<Scanner> {
  return new Promise<Scanner>((resolve, reject) => {
    const bonjour = new Bonjour();
    const browser = bonjour.find({ type: "uscan" });

    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      try {
        browser.stop();
        bonjour.destroy();
      } catch {
        // ignore teardown errors
      }
    };
    const onAbort = () => {
      cleanup();
      reject(new Error("Cancelled."));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("No eSCL scanner found on the network. Set the scanner host in Flipside preferences."));
    }, 6000);

    signal.addEventListener("abort", onAbort);

    browser.on("up", (service: Service) => {
      // Prefer a numeric IPv4. A `.local` hostname often can't be resolved
      // inside Raycast's sandbox, so fall back to the mDNS reply's source
      // address before ever using `service.host`.
      const ipv4 = (service.addresses ?? []).find((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a));
      const referer = (service as unknown as { referer?: { address?: string } }).referer?.address;
      const address = ipv4 ?? referer ?? service.host;
      const rs = (service.txt as Record<string, string> | undefined)?.rs ?? "eSCL";
      cleanup();
      resolve({ base: `http://${address}:${service.port}/${rs.replace(/^\/|\/$/g, "")}`, name: service.name });
    });
  });
}

/** Read whether the ADF currently has paper loaded. */
export async function getAdfState(scanner: Scanner, signal: AbortSignal): Promise<AdfState> {
  const url = `${scanner.base}/ScannerStatus`;
  try {
    const res = await fetch(url, { signal });
    const text = await res.text();
    const adf = /<scan:AdfState>([^<]*)<\/scan:AdfState>/.exec(text)?.[1];
    const state: AdfState = text.includes("ScannerAdfLoaded")
      ? "loaded"
      : text.includes("ScannerAdfEmpty")
        ? "empty"
        : "unknown";
    debug(`getAdfState: ${url} -> HTTP ${res.status}, AdfState=${adf ?? "?"} => ${state}`);
    return state;
  } catch (e) {
    debug(`getAdfState: ${url} -> ERROR ${e instanceof Error ? e.message : String(e)}`);
    return "unknown";
  }
}

/**
 * Run one ADF pass. Returns one JPEG (as bytes) per sheet, in the scanner's
 * native feed order.
 */
export async function scanPass(
  scanner: Scanner,
  opts: ScanOptions,
  signal: AbortSignal,
  onPage?: (count: number) => void,
): Promise<Uint8Array[]> {
  const res = await fetch(`${scanner.base}/ScanJobs`, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: scanSettings(opts),
    signal,
  });
  debug(`scanPass: POST ${scanner.base}/ScanJobs -> HTTP ${res.status}`);
  if (res.status !== 201) {
    throw new Error(`Scan request rejected (HTTP ${res.status}). Is the scanner reachable and the ADF loaded?`);
  }
  const location = res.headers.get("location");
  if (!location) throw new Error("Scanner did not return a job location.");

  const origin = new URL(scanner.base).origin;
  const job = (location.startsWith("http") ? location : `${origin}${location}`).replace(/\/+$/, "");
  debug(`scanPass: job = ${job}`);

  const pages: Uint8Array[] = [];
  for (;;) {
    if (signal.aborted) throw new Error("Cancelled.");
    const doc = await fetch(`${job}/NextDocument`, { signal });
    if (doc.status === 404 || doc.status === 410) break; // no more pages
    if (!doc.ok) throw new Error(`Failed to retrieve a scanned page (HTTP ${doc.status}).`);
    const bytes = new Uint8Array(await doc.arrayBuffer());
    if (bytes.byteLength === 0) break;
    pages.push(bytes);
    onPage?.(pages.length);
  }
  return pages;
}
