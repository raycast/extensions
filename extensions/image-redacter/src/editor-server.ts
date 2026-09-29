import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { randomBytes } from "node:crypto";
import { PDF_MIME_TYPE } from "./source-file";

type EditorSession = {
  url: string;
  loaded: Promise<void>;
  close: () => Promise<void>;
};

const LOAD_TIMEOUT_MS = 60_000;
// PDF pages request fonts, character maps and decoders lazily as the user moves
// between pages, so the server stays up until the editor has been quiet a while.
const IDLE_SHUTDOWN_MS = 5 * 60_000;

const BASE_RESOURCES = ["page", "css", "js", "config", "source"];
const PDF_RESOURCES = ["pdf.min.mjs", "pdf.worker.min.mjs", "pdf-lib.min.js"];

const CONTENT_TYPES: Record<string, string> = {
  ".bcmap": "application/octet-stream",
  ".icc": "application/octet-stream",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".pfb": "application/octet-stream",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
};

export async function startEditorSession(
  sourcePath: string,
  mimeType: string,
  config: Record<string, unknown>,
  options: {
    assetsPath?: string;
    loadTimeoutMs?: number;
    idleTimeoutMs?: number;
  } = {},
): Promise<EditorSession> {
  const token = randomBytes(24).toString("hex");
  const assets =
    options.assetsPath ?? (await import("@raycast/api")).environment.assetsPath;
  const vendor = resolve(assets, "vendor");
  const sourceStat = await stat(sourcePath);
  const isPdf = mimeType === PDF_MIME_TYPE;
  const required = new Set([
    ...BASE_RESOURCES,
    ...(isPdf ? PDF_RESOURCES : []),
  ]);
  const served = new Set<string>();
  let resolveLoaded!: () => void;
  let rejectLoaded!: (error: Error) => void;
  let settled = false;
  let idleTimer: NodeJS.Timeout | undefined;
  const loaded = new Promise<void>((resolve, reject) => {
    resolveLoaded = resolve;
    rejectLoaded = reject;
  });

  function markServed(resource: string) {
    served.add(resource);
    if (!settled && [...required].every((name) => served.has(name))) {
      settled = true;
      resolveLoaded();
      resetIdleTimer();
    }
  }

  function resetIdleTimer() {
    if (!settled) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(
      () => void close(),
      options.idleTimeoutMs ?? IDLE_SHUTDOWN_MS,
    );
    idleTimer.unref();
  }

  const server = createServer(async (request, response) => {
    const address = server.address();
    const expectedHost =
      address && typeof address !== "string" ? `127.0.0.1:${address.port}` : "";
    if (
      request.headers.host !== expectedHost ||
      (request.headers.origin &&
        request.headers.origin !== `http://${expectedHost}`)
    ) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if (request.method !== "GET") {
      response.writeHead(405, { Allow: "GET" }).end("Method not allowed");
      return;
    }
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const route = requestUrl.pathname;
    const prefix = `/${token}`;

    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Frame-Options", "DENY");

    try {
      if (route === `${prefix}/ping`) {
        resetIdleTimer();
        response.writeHead(204).end();
      } else if (route === prefix || route === `${prefix}/`) {
        resetIdleTimer();
        await sendAsset(
          response,
          join(assets, "editor.html"),
          "text/html; charset=utf-8",
        );
        markServed("page");
      } else if (route === `${prefix}/editor.css`) {
        await sendAsset(
          response,
          join(assets, "editor.css"),
          "text/css; charset=utf-8",
        );
        markServed("css");
      } else if (route === `${prefix}/editor.js`) {
        await sendAsset(
          response,
          join(assets, "editor.js"),
          "text/javascript; charset=utf-8",
        );
        markServed("js");
      } else if (route === `${prefix}/config`) {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(JSON.stringify(config));
        markServed("config");
      } else if (route === `${prefix}/source`) {
        response.statusCode = 200;
        response.setHeader("Content-Type", mimeType);
        response.setHeader("Content-Length", sourceStat.size);
        const stream = createReadStream(sourcePath);
        stream.on("error", () => response.destroy());
        stream.on("end", () => markServed("source"));
        stream.pipe(response);
      } else if (route.startsWith(`${prefix}/vendor/`)) {
        const relativePath = decodeURIComponent(
          route.slice(`${prefix}/vendor/`.length),
        );
        const path = resolve(vendor, relativePath);
        const contentType = CONTENT_TYPES[extname(path)];
        if (!path.startsWith(vendor + sep) || !contentType) {
          sendNotFound(response);
          return;
        }
        await sendAsset(response, path, contentType);
        markServed(relativePath);
      } else {
        sendNotFound(response);
      }
    } catch {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      response.statusCode = 500;
      response.end("Unable to load the editor");
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not start the private editor.");
  }

  const close = async () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (!server.listening) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };

  const timeout = setTimeout(() => {
    if (!settled) {
      settled = true;
      rejectLoaded(
        new Error("The editor did not finish loading. Open the file again."),
      );
      void close();
    }
  }, options.loadTimeoutMs ?? LOAD_TIMEOUT_MS);
  timeout.unref();
  loaded.finally(() => clearTimeout(timeout)).catch(() => undefined);

  return { url: `http://127.0.0.1:${address.port}/${token}/`, loaded, close };
}

export async function openEditor(
  sourcePath: string,
  mimeType: string,
  config: Record<string, unknown>,
): Promise<void> {
  const session = await startEditorSession(sourcePath, mimeType, config);
  try {
    const { open } = await import("@raycast/api");
    await open(session.url);
    await session.loaded;
  } catch (error) {
    await session.close();
    throw error;
  }
}

function sendNotFound(response: ServerResponse) {
  response.statusCode = 404;
  response.end("Not found");
}

async function sendAsset(
  response: ServerResponse,
  path: string,
  contentType: string,
): Promise<void> {
  const body = await readFile(path);
  response.statusCode = 200;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Content-Length", body.byteLength);
  response.end(body);
}
