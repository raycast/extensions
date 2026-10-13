import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { createConnection } from "node:net";
import { StringDecoder } from "node:string_decoder";
import { mkdir, chmod, lstat, unlink } from "node:fs/promises";
import { Paths } from "./paths";
import { Controller } from "./controller";
import {
  MAX_BODY_BYTES,
  validateQuery,
  validateConfig,
  CONFIG_CONFLICT,
} from "./protocol";

// Private Unix socket -> bounded protocol -> controller -> native worker.
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_TOO_LARGE = 413;
const HTTP_BUSY = 429;
const HTTP_UNAVAILABLE = 503;
const MAX_CONNECTIONS = 8;

class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function respond(res: ServerResponse, status: number, value: unknown): void {
  if (res.destroyed) {
    return;
  }
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}

function body(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // JSON text may cross UTF-8 byte boundaries; enforce byte limits without changing its characters.
    const decoder = new StringDecoder();
    let bytes = 0,
      output = "",
      exceeded = false;
    req.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        if (!exceeded) {
          reject(
            new RequestError(HTTP_TOO_LARGE, "Request exceeds size budget"),
          );
        }
        exceeded = true;
        output = "";
        return;
      }
      if (!exceeded) {
        output += decoder.write(chunk);
      }
    });
    req.on("end", () => {
      if (exceeded) {
        return;
      }
      try {
        resolve(JSON.parse(output + decoder.end()));
      } catch {
        reject(new RequestError(HTTP_BAD_REQUEST, "Expected JSON request"));
      }
    });
    req.on("error", reject);
  });
}

async function removeStaleSocket(socket: string): Promise<void> {
  try {
    const file = await lstat(socket);
    if (!file.isSocket()) {
      throw new Error("Service socket path is occupied by a non-socket file");
    }
    const active = await new Promise<boolean>((resolve, reject) => {
      const connection = createConnection(socket);
      connection.setTimeout(500);
      connection.on("connect", () => {
        connection.destroy();
        resolve(true);
      });
      connection.on("timeout", () => {
        connection.destroy();
        reject(new Error("Existing service socket did not respond"));
      });
      connection.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "ECONNREFUSED" || error.code === "ENOENT") {
          resolve(false);
          return;
        }
        reject(error);
      });
    });
    if (active) {
      throw new Error("Local Search service is already running");
    }
    await unlink(socket);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function createService(locations: Paths) {
  await mkdir(locations.base, { recursive: true, mode: 0o700 });
  await chmod(locations.base, 0o700);
  await removeStaleSocket(locations.socket);
  const controller = new Controller(locations);
  await controller.initialize();
  const server = createServer((req, res) => {
    void (async () => {
      if (req.headers.origin) {
        throw new RequestError(
          HTTP_FORBIDDEN,
          "Browser requests are not allowed",
        );
      }
      if (req.method === "GET" && req.url === "/status") {
        respond(res, HTTP_OK, await controller.status());
        return;
      }
      if (req.method === "POST" && req.url === "/config") {
        const input = await body(req);
        const config = validateConfig(input);
        // Conditional UI writes retain compatibility with explicit unconditional installation/test clients.
        await controller.configure(
          config,
          (input as { expectedConfig?: unknown }).expectedConfig,
        );
        respond(res, HTTP_OK, await controller.status());
        return;
      }
      if (req.method === "POST" && req.url === "/rescan") {
        controller.markDirty();
        respond(res, HTTP_OK, await controller.status());
        return;
      }
      if (req.method === "POST" && req.url === "/search") {
        const input = (await body(req)) as { query?: unknown };
        const query = validateQuery(input?.query);
        const abort = new AbortController();
        res.on("close", () => {
          if (!res.writableEnded) {
            abort.abort();
          }
        });
        try {
          respond(res, HTTP_OK, {
            hits: await controller.search(query, abort.signal),
          });
        } catch (error) {
          throw new RequestError(
            String(error).includes("already running")
              ? HTTP_BUSY
              : HTTP_UNAVAILABLE,
            error instanceof Error ? error.message : String(error),
          );
        }
        return;
      }
      throw new RequestError(HTTP_NOT_FOUND, "Unknown service command");
    })().catch((error) => {
      respond(
        res,
        error instanceof RequestError
          ? error.status
          : error instanceof Error && error.name === CONFIG_CONFLICT
            ? HTTP_CONFLICT
            : HTTP_BAD_REQUEST,
        { error: error instanceof Error ? error.message : String(error) },
      );
    });
  });
  server.maxConnections = MAX_CONNECTIONS;
  server.headersTimeout = 5000;
  server.requestTimeout = 45000;
  server.keepAliveTimeout = 1000;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(locations.socket, resolve);
    });
    await chmod(locations.socket, 0o600);
  } catch (error) {
    await controller.close();
    throw error;
  }

  return {
    socket: locations.socket,
    close: async () => {
      server.closeAllConnections();
      await controller.close();
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    },
  };
}
