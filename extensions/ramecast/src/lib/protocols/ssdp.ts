import dgram from "dgram";

const SSDP_ADDR = "239.255.255.250";
const SSDP_PORT = 1900;

export interface SsdpResponse {
  /** Lower-cased header names. */
  headers: Record<string, string>;
  address: string;
}

/**
 * Parse a URL a device gave us and accept it only if it points back at that same device over HTTP.
 * Discovery data comes from anyone on the LAN, so this stops a reply from steering requests at
 * localhost or other internal services.
 */
export function deviceUrl(raw: string | undefined, deviceHost: string, base?: string): URL | undefined {
  if (!raw) return undefined;
  try {
    const url = base ? new URL(raw, base) : new URL(raw);
    if (url.protocol !== "http:" || url.hostname !== deviceHost || url.username || url.password) return undefined;
    return url;
  } catch {
    return undefined; // malformed
  }
}

/** fetch() limited to the device: redirects are refused, since they could lead anywhere. */
export function fetchDevice(url: URL, init: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  return fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
}

/** Send SSDP M-SEARCH queries for the given search targets and report every response. */
export function ssdpSearch(
  targets: string[],
  durationMs: number,
  onResponse: (res: SsdpResponse) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    const send = () => {
      for (const st of targets) {
        const msg = Buffer.from(
          `M-SEARCH * HTTP/1.1\r\nHOST: ${SSDP_ADDR}:${SSDP_PORT}\r\nMAN: "ssdp:discover"\r\nMX: 2\r\nST: ${st}\r\n\r\n`,
        );
        socket.send(msg, SSDP_PORT, SSDP_ADDR, () => undefined);
      }
    };
    socket.on("message", (msg, rinfo) => {
      const headers: Record<string, string> = {};
      for (const line of msg.toString().split(/\r?\n/).slice(1)) {
        const i = line.indexOf(":");
        if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
      }
      try {
        onResponse({ headers, address: rinfo.address });
      } catch {
        // one malformed reply must not end the scan
      }
    });
    let timer: NodeJS.Timeout | undefined;
    let done = false;
    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      if (timer) clearInterval(timer);
      clearTimeout(deadline);
      try {
        socket.close();
      } catch {
        // already closed
      }
      if (err) reject(err);
      else resolve();
    };
    socket.on("error", (err) => finish(err));
    socket.bind(0, () => {
      send();
      timer = setInterval(send, 2000);
    });
    const deadline = setTimeout(() => finish(), durationMs);
  });
}

/** Text content of the first <tag> in a simple XML document (namespace prefixes ignored). */
export function xmlTag(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, "i"));
  return m ? decodeXml(m[1].trim()) : undefined;
}

export function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
