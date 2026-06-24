import { connect } from "net";

const PROBE_TIMEOUT_MS = 400;

// Decides whether a listening port is a real web page you can open in a browser.
// We use a raw socket (not fetch): probing non-HTTP services like Postgres/Redis/MySQL can
// make Node's HTTP parser throw uncaught errors. We send a minimal request and keep the port
// only if it answers with an OK/redirect status AND HTML — that filters out databases as well
// as desktop apps that run local HTTP/IPC servers (Steam, Logitech, SignalRGB, …) which reply
// with errors or non-HTML content. Short timeout keeps the whole scan fast.
export function respondsToHttp(port: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: "localhost", port: Number(port) });
    let buffer = "";
    let settled = false;

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    const evaluate = () => {
      const headEnd = buffer.indexOf("\r\n\r\n");
      const head = (headEnd === -1 ? buffer : buffer.slice(0, headEnd)).toLowerCase();
      const statusMatch = head.match(/^http\/\d\.\d (\d{3})/);
      if (!statusMatch) return finish(false);
      const status = Number(statusMatch[1]);
      const isHtml = /content-type:[^\r\n]*html/.test(head);
      finish(status >= 200 && status < 400 && isHtml);
    };

    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.on("connect", () => {
      socket.write("GET / HTTP/1.0\r\nHost: localhost\r\nConnection: close\r\n\r\n");
    });
    socket.on("data", (chunk) => {
      buffer += chunk.toString("latin1");
      if (buffer.indexOf("\r\n\r\n") !== -1 || buffer.length > 8192) evaluate();
    });
    socket.on("timeout", () => finish(false));
    socket.on("error", () => finish(false));
    socket.on("close", () => {
      if (!settled) evaluate();
    });
  });
}
