import http from "http";

export function handleShutdown(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  server: http.Server,
  onClose: () => void,
) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, data: { status: "shutting_down" } }));
  server.close(onClose);
}
