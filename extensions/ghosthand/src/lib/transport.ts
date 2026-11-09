import http, { type IncomingMessage } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { GhosthandError, isRecord, problemError } from "./errors";

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  accept?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
};

// No TCP fallback: this release only talks to the user's existing local daemon.
export class SocketTransport {
  constructor(private readonly socketPath = join(homedir(), ".ghosthand", "daemon.sock")) {}

  async request(path: string, options: RequestOptions = {}): Promise<IncomingMessage> {
    options.signal?.throwIfAborted();
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const request = http.request({
        socketPath: this.socketPath,
        path,
        method: options.method ?? "GET",
        signal: options.signal,
        headers: {
          Accept: options.accept ?? "application/json",
          "User-Agent": "raycast-ghosthand/1.0",
          ...(body === undefined
            ? {}
            : { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }),
        },
      });
      // An absolute deadline also bounds peers that keep a request alive without finishing.
      const timer = setTimeout(() => {
        request.destroy(
          new GhosthandError("request-timeout", "Ghosthand took too long to respond. The outcome may be unknown."),
        );
      }, options.timeoutMs ?? 30_000);
      request.on("error", (error: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        if (error.name === "AbortError" || error instanceof GhosthandError) reject(error);
        else if (["ENOENT", "ECONNREFUSED", "EACCES"].includes(error.code ?? "")) {
          reject(new GhosthandError("daemon-unreachable", "Cannot reach Ghosthand at ~/.ghosthand/daemon.sock."));
        } else
          reject(
            new GhosthandError(
              "connection-lost",
              "The connection to Ghosthand was interrupted. The outcome may be unknown.",
            ),
          );
      });
      request.on("response", (incoming) => {
        incoming.once("close", () => clearTimeout(timer));
        resolve(incoming);
      });
      request.end(body);
    });
    if ((response.statusCode ?? 500) >= 300 || (response.statusCode ?? 500) < 200) {
      const bytes = await readBody(response);
      let problem: unknown;
      try {
        problem = JSON.parse(bytes.toString("utf8"));
      } catch {
        /* Report status without reflecting arbitrary HTML. */
      }
      throw problemError(problem, response.statusCode);
    }
    return response;
  }

  async json<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const value = parseJSON<T>(await readBody(await this.request(path, options)));
    if (isRecord(value) && typeof value.code === "string" && typeof value.detail === "string")
      throw problemError(value);
    return value;
  }
}

export async function readBody(response: IncomingMessage, maxBytes = 20 * 1024 * 1024): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of response) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) {
      response.destroy();
      throw new GhosthandError("invalid-response", "Ghosthand returned a response larger than expected.");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export function parseJSON<T>(buffer: Buffer): T {
  try {
    return JSON.parse(buffer.toString("utf8")) as T;
  } catch {
    throw new GhosthandError(
      "invalid-response",
      "Ghosthand returned invalid JSON. Inspect the screen before retrying.",
    );
  }
}
