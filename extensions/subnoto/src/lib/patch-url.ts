import { environment } from "@raycast/api";
import http from "node:http";
import https from "node:https";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The SDK does `new URL("oak_session_wasm_nodejs_bg.wasm", import.meta.url)` then
// `readFileSync(url)`. Raycast's bundler leaves import.meta.url empty (or points at
// the JS bundle, not assets). Always resolve the wasm from assets as a filesystem path.
const wasmFileName = "oak_session_wasm_nodejs_bg.wasm";
const wasmFsPath = join(environment.assetsPath, wasmFileName);
const wasmFileUrl = pathToFileURL(wasmFsPath).href;
const wasmBase = wasmFileUrl.replace(/[^/]+$/, "");

function isWasmRef(input: unknown): boolean {
  const value = String(input);
  return value === wasmFileName || value.endsWith(wasmFileName);
}

const OriginalURL = globalThis.URL;
globalThis.URL = class PatchedURL extends OriginalURL {
  constructor(input: string | URL, base?: string | URL) {
    super(input as string, isWasmRef(input) ? wasmBase : base);
  }
} as typeof URL;

const require = createRequire(wasmFileUrl);
const fs = require("node:fs") as typeof import("node:fs");
const originalReadFileSync = fs.readFileSync.bind(fs);

function resolveReadPath(path: Parameters<typeof fs.readFileSync>[0]): Parameters<typeof fs.readFileSync>[0] {
  if (isWasmRef(path)) {
    return wasmFsPath;
  }
  if (typeof path === "string" && path.startsWith("file:")) {
    return fileURLToPath(path);
  }
  if (path instanceof URL && path.protocol === "file:") {
    return fileURLToPath(path);
  }
  return path;
}

fs.readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], options?: Parameters<typeof fs.readFileSync>[1]) =>
  originalReadFileSync(resolveReadPath(path), options as never)) as typeof fs.readFileSync;

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

const OriginalRequest = globalThis.Request;
globalThis.Request = class PatchedRequest extends OriginalRequest {
  constructor(input: FetchInput, init?: FetchInit) {
    const method = (init?.method ?? (input instanceof OriginalRequest ? input.method : "GET")).toUpperCase();
    const hasBody = init?.body != null;
    if (hasBody && method !== "GET" && method !== "HEAD" && init && !("duplex" in init)) {
      init = { ...init, duplex: "half" };
    }
    super(input, init);
  }
} as typeof Request;

async function bodyToBuffer(body: FetchInit["body"]): Promise<Buffer | undefined> {
  if (body == null) {
    return undefined;
  }
  if (typeof body === "string") {
    return Buffer.from(body);
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  if (body instanceof ArrayBuffer) {
    return Buffer.from(body);
  }
  if (ArrayBuffer.isView(body)) {
    return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const request = new OriginalRequest("http://local.invalid", { method: "POST", body, duplex: "half" });
    return Buffer.from(await request.arrayBuffer());
  }
  if (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        chunks.push(value);
      }
    }
    return Buffer.concat(chunks);
  }
  return undefined;
}

async function nodeHttpFetch(input: FetchInput, init?: FetchInit): Promise<Response> {
  let url: string;
  let method: string;
  let headers: Headers;
  let body: Buffer | undefined;

  if (input instanceof OriginalRequest && init == null) {
    url = input.url;
    method = input.method;
    headers = new Headers(input.headers);
    body = Buffer.from(await input.arrayBuffer());
  } else {
    url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    method = init?.method ?? (input instanceof OriginalRequest ? input.method : "GET");
    headers = new Headers(init?.headers ?? (input instanceof OriginalRequest ? input.headers : undefined));
    body = await bodyToBuffer(init?.body ?? null);
    if (!body && input instanceof OriginalRequest) {
      body = Buffer.from(await input.arrayBuffer());
    }
  }

  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError(`Unsupported protocol: ${parsed.protocol}`);
  }

  if (body && !headers.has("content-length")) {
    headers.set("content-length", String(body.byteLength));
  }

  const requestHeaders: Record<string, string> = {};
  headers.forEach((value, key) => {
    requestHeaders[key] = value;
  });

  const lib = parsed.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error?: Error, response?: Response) => {
      if (settled) {
        return;
      }
      settled = true;
      if (error) {
        reject(error);
      } else {
        resolve(response as Response);
      }
    };

    const req = lib.request(parsed, { method, headers: requestHeaders }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("error", (error) => {
        req.destroy();
        settle(error);
      });
      res.on("end", () => {
        const responseHeaders = new Headers();
        const raw = res.rawHeaders;
        for (let i = 0; i < raw.length; i += 2) {
          responseHeaders.append(raw[i], raw[i + 1]);
        }
        settle(
          undefined,
          new Response(Buffer.concat(chunks), {
            status: res.statusCode ?? 200,
            statusText: res.statusMessage ?? "",
            headers: responseHeaders,
          })
        );
      });
    });
    req.on("error", settle);
    if (body && body.byteLength > 0) {
      req.write(body);
    }
    req.end();
  });
}

globalThis.fetch = (async (input: FetchInput, init?: FetchInit) => {
  const url =
    typeof input === "string" ? input : input instanceof URL ? input.href : input instanceof Request ? input.url : "";
  if (url.startsWith("file:") && isWasmRef(url)) {
    const bytes = originalReadFileSync(wasmFsPath);
    return new Response(Uint8Array.from(bytes), {
      status: 200,
      headers: { "Content-Type": "application/wasm" },
    });
  }
  return nodeHttpFetch(input, init);
}) as typeof fetch;
