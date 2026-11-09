import dgram from "dgram";

const SSDP_ADDR = "239.255.255.250";
const SSDP_PORT = 1900;

export interface SsdpResponse {
  /** Lower-cased header names. */
  headers: Record<string, string>;
  address: string;
}

/** Send SSDP M-SEARCH queries for the given search targets and report every response. */
export function ssdpSearch(
  targets: string[],
  durationMs: number,
  onResponse: (res: SsdpResponse) => void,
): Promise<void> {
  return new Promise((resolve) => {
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
      onResponse({ headers, address: rinfo.address });
    });
    socket.on("error", () => undefined);
    let timer: NodeJS.Timeout | undefined;
    socket.bind(0, () => {
      send();
      timer = setInterval(send, 2000);
    });
    setTimeout(() => {
      if (timer) clearInterval(timer);
      socket.close();
      resolve();
    }, durationMs);
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
