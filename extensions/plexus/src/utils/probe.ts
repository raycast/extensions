import { connect } from "net";

// Inactivity timeout, not a hard deadline: fast servers resolve the instant their first bytes
// arrive, so this only caps how long we wait on a slow/silent responder. Dev servers (Next.js,
// Nuxt, Angular, …) compile and server-render each request in dev mode and routinely take ~1s
// to answer — the very servers Plexus exists to find — so the budget must comfortably clear
// that. A non-HTTP service that accepts the connection but stays silent is the only case that
// pays the full wait; databases reject fast because they send a handshake banner immediately.
const PROBE_TIMEOUT_MS = 2500;

// Once a port is confirmed to be HTML, keep reading the body only far enough to find <title>.
// <title> lives early in <head>, so this caps memory without missing it on real pages.
const MAX_BODY_BYTES = 64 * 1024;

export type ProbeResult = {
  // Whether the port is a real web page you can open in a browser.
  ok: boolean;
  // The page <title>, lifted from the same response so we don't fetch the page a second time.
  title?: string;
};

function extractTitle(buffer: string): string | undefined {
  const match = buffer.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match && match[1] ? match[1].trim() || undefined : undefined;
}

// Probes a listening port with a raw socket (not fetch): probing non-HTTP services like
// Postgres/Redis/MySQL can make Node's HTTP parser throw uncaught errors. We send a minimal
// request and keep the port only if it answers with an OK/redirect status AND HTML — that filters
// out databases as well as desktop apps that run local HTTP/IPC servers (Steam, Logitech,
// SignalRGB, …) which reply with errors or non-HTML content. When it is a web page, we read on a
// little further to capture <title> from the same response instead of fetching the page again.
export function probeHttp(port: string): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const socket = connect({ host: "localhost", port: Number(port) });
    let buffer = "";
    let settled = false;
    let isWeb = false; // flips true once the headers confirm OK status + HTML

    const finish = (result: ProbeResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    // Returns true once headers confirm a web page; otherwise finishes the probe as non-web.
    const confirmWeb = (): boolean => {
      const headEnd = buffer.indexOf("\r\n\r\n");
      const head = (headEnd === -1 ? buffer : buffer.slice(0, headEnd)).toLowerCase();
      const statusMatch = head.match(/^http\/\d\.\d (\d{3})/);
      if (!statusMatch) {
        finish({ ok: false });
        return false;
      }
      const status = Number(statusMatch[1]);
      const isHtml = /content-type:[^\r\n]*html/.test(head);
      if (!(status >= 200 && status < 400 && isHtml)) {
        finish({ ok: false });
        return false;
      }
      return true;
    };

    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.on("connect", () => {
      socket.write("GET / HTTP/1.0\r\nHost: localhost\r\nConnection: close\r\n\r\n");
    });
    socket.on("data", (chunk) => {
      buffer += chunk.toString("latin1");
      if (!isWeb) {
        // Wait until the full header block has arrived before judging.
        if (buffer.indexOf("\r\n\r\n") === -1 && buffer.length <= 8192) return;
        if (!confirmWeb()) return;
        isWeb = true;
      }
      // Confirmed web: stop as soon as we have the title or have read enough of the body.
      if (/<\/title>/i.test(buffer) || buffer.length > MAX_BODY_BYTES) {
        finish({ ok: true, title: extractTitle(buffer) });
      }
    });
    // A slow body is still a web server — resolve ok with whatever title (if any) we captured.
    socket.on("timeout", () => finish(isWeb ? { ok: true, title: extractTitle(buffer) } : { ok: false }));
    socket.on("error", () => finish({ ok: false }));
    socket.on("close", () => {
      if (settled) return;
      if (isWeb) finish({ ok: true, title: extractTitle(buffer) });
      else if (confirmWeb()) finish({ ok: true, title: extractTitle(buffer) });
    });
  });
}
