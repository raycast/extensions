import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { randomBytes } from "node:crypto";

type EditorSession = {
  url: string;
  loaded: Promise<void>;
  close: () => Promise<void>;
};

export type EditorLifecycle = {
  onReady?: () => Promise<Record<string, unknown> | void>;
  onClose?: () => Promise<void>;
  onUpgrade?: () => Promise<void>;
};

const LOAD_TIMEOUT_MS = 60_000;
// PDF pages request fonts, character maps and decoders lazily as the user moves
// between pages, so the server stays up until the editor has been quiet a while.
const IDLE_SHUTDOWN_MS = 5 * 60_000;

const CONTENT_TYPES: Record<string, string> = {
  ".bcmap": "application/octet-stream",
  ".icc": "application/octet-stream",
  ".gz": "application/gzip",
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
  options: EditorLifecycle & {
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
  let readyResult: Promise<Record<string, unknown>> | undefined;
  let resolveLoaded!: () => void;
  let rejectLoaded!: (error: Error) => void;
  let settled = false;
  let idleTimer: NodeJS.Timeout | undefined;
  const loaded = new Promise<void>((resolve, reject) => {
    resolveLoaded = resolve;
    rejectLoaded = reject;
  });

  function resetIdleTimer() {
    if (!settled) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(
      () => void close().catch(() => undefined),
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
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const route = requestUrl.pathname;
    const prefix = `/${token}`;

    const lifecycleRoute = ["ready", "failed", "upgrade"].some(
      (name) => route === `${prefix}/${name}`,
    );
    if (request.method !== (lifecycleRoute ? "POST" : "GET")) {
      response
        .writeHead(405, { Allow: lifecycleRoute ? "POST" : "GET" })
        .end("Method not allowed");
      return;
    }

    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'none'",
        "script-src 'self' 'wasm-unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data:",
        "font-src 'self'",
        "connect-src 'self'",
        "worker-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
      ].join("; "),
    );

    try {
      if (route === `${prefix}/ready`) {
        // Decoding completed; the bounded entitlement commit now owns readiness.
        clearTimeout(timeout);
        readyResult ??= Promise.resolve().then(async () => {
          Object.assign(config, await options.onReady?.());
          return config;
        });
        try {
          const readyConfig = await readyResult;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify(readyConfig));
          if (!settled) {
            settled = true;
            resolveLoaded();
          }
          resetIdleTimer();
        } catch {
          response.writeHead(500).end("Unable to prepare the editor");
          if (!settled) {
            settled = true;
            rejectLoaded(
              new Error("Could not prepare the editor. Open the file again."),
            );
          }
          void close().catch(() => undefined);
        }
      } else if (route === `${prefix}/failed`) {
        response.writeHead(204).end();
        if (!settled) {
          settled = true;
          rejectLoaded(
            new Error(
              "The editor could not decode the file. Choose a valid image or PDF.",
            ),
          );
        }
        void close().catch(() => undefined);
      } else if (route === `${prefix}/upgrade`) {
        await options.onUpgrade?.();
        response.writeHead(204).end();
      } else if (route === `${prefix}/ping`) {
        resetIdleTimer();
        response.writeHead(204).end();
      } else if (route === prefix || route === `${prefix}/`) {
        resetIdleTimer();
        await sendAsset(
          response,
          join(assets, "editor.html"),
          "text/html; charset=utf-8",
        );
      } else if (route === `${prefix}/editor.css`) {
        await sendAsset(
          response,
          join(assets, "editor.css"),
          "text/css; charset=utf-8",
        );
      } else if (route === `${prefix}/editor.js`) {
        await sendAsset(
          response,
          join(assets, "editor.js"),
          "text/javascript; charset=utf-8",
        );
      } else if (route === `${prefix}/config`) {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(JSON.stringify(config));
      } else if (route === `${prefix}/source`) {
        response.statusCode = 200;
        response.setHeader("Content-Type", mimeType);
        response.setHeader("Content-Length", sourceStat.size);
        const stream = createReadStream(sourcePath);
        stream.on("error", () => response.destroy());
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
      } else if (route === `${prefix}/fonts/PlusJakartaSans.ttf`) {
        await sendAsset(
          response,
          join(assets, "fonts", "PlusJakartaSans.ttf"),
          "font/ttf",
        );
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

  let closing: Promise<void> | undefined;
  const close = (): Promise<void> => {
    if (closing) return closing;
    if (idleTimer) clearTimeout(idleTimer);
    closing = (async () => {
      if (!settled) {
        settled = true;
        rejectLoaded(new Error("The editor closed before loading the file."));
      }
      if (server.listening) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
      await options.onClose?.();
    })();
    return closing;
  };

  const timeout = setTimeout(() => {
    if (!settled) {
      settled = true;
      rejectLoaded(
        new Error("The editor did not finish loading. Open the file again."),
      );
      void close().catch(() => undefined);
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
  options: EditorLifecycle = {},
): Promise<void> {
  const session = await startEditorSession(
    sourcePath,
    mimeType,
    config,
    options,
  );
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
