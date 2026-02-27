import http from "http";

export function ok(res: http.ServerResponse, data: unknown) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, data }));
}

export function fail(
  res: http.ServerResponse,
  status: number,
  code: string,
  message: string,
  hint?: string,
) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      ok: false,
      error: { code, message, ...(hint ? { hint } : {}) },
    }),
  );
}

export function parseBody(
  req: http.IncomingMessage,
  maxBytes = 1024 * 1024,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
