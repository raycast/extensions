import { createParser, type ParsedEvent, type ReconnectInterval } from "eventsource-parser";
import fetch, { RequestInit } from "node-fetch";
import { Transform, TransformCallback, TransformOptions } from "stream";
import { DiagnosticLogger, noopDiagnosticLogger } from "./diagnostics";

export const DEFAULT_TIMEOUT = 60 * 1000;
export type FetchSSEOptions = RequestInit & {
  diagnostics?: DiagnosticLogger;
};

function getResponseHeader(resp: { headers: { get(name: string): string | null } }, name: string) {
  return resp.headers.get(name) ?? undefined;
}

function routerResponseMeta(resp: { headers: { get(name: string): string | null } }) {
  return {
    traceparent: getResponseHeader(resp, "traceparent"),
    routerRequestId: getResponseHeader(resp, "x-router-request-id"),
    routerTraceId: getResponseHeader(resp, "x-router-trace-id"),
    routerSpanId: getResponseHeader(resp, "x-router-span-id"),
    routerClientRequestId: getResponseHeader(resp, "x-router-client-request-id"),
    routerSessionId: getResponseHeader(resp, "x-router-session-id"),
  };
}

export async function* fetchSSE(input: string, options: FetchSSEOptions) {
  const { signal: originSignal, diagnostics: inputDiagnostics, ...fetchOptions } = options;
  const timeout = DEFAULT_TIMEOUT;
  const ctrl = new AbortController();
  const { signal } = ctrl;
  const diagnostics = inputDiagnostics ?? noopDiagnosticLogger;
  const startedAt = Date.now();
  let chunkCount = 0;
  let byteCount = 0;
  let firstChunkAt = 0;
  if (originSignal) {
    originSignal.addEventListener("abort", () => ctrl.abort());
  }
  const timerId = setTimeout(() => {
    diagnostics.checkpoint("http.timeout", { timeoutMs: timeout });
    ctrl.abort();
  }, timeout);
  try {
    diagnostics.checkpoint("http.request.start", { url: input, timeoutMs: timeout });
    const resp = await fetch(input, { ...fetchOptions, signal });
    clearTimeout(timerId);
    diagnostics.checkpoint("http.response", {
      status: resp.status,
      ok: resp.ok,
      responseMs: Date.now() - startedAt,
      ...routerResponseMeta(resp),
    });

    if (resp.status !== 200) {
      const responseText = await resp.text();
      diagnostics.finish("http.response.error", { status: resp.status, bodyChars: responseText.length });
      let errorBody: unknown;
      try {
        errorBody = JSON.parse(responseText);
      } catch {
        throw new Error(responseText || `HTTP request failed with status ${resp.status}`);
      }
      throw errorBody;
    }
    const rs = resp.body;
    if (rs) {
      for await (const chunk of rs) {
        chunkCount += 1;
        byteCount += Buffer.byteLength(chunk as Buffer);
        if (!firstChunkAt) {
          firstChunkAt = Date.now();
          diagnostics.checkpoint("http.first_chunk", {
            firstChunkMs: firstChunkAt - startedAt,
            chunkBytes: Buffer.byteLength(chunk as Buffer),
          });
        } else if (chunkCount <= 5 || chunkCount % 20 === 0) {
          diagnostics.checkpoint("http.chunk", { chunkCount, byteCount });
        }
        yield chunk;
      }
    }
    diagnostics.finish("http.complete", { chunkCount, byteCount, totalMs: Date.now() - startedAt });
  } catch (error) {
    if (ctrl.signal.aborted) {
      diagnostics.finish("http.aborted", { totalMs: Date.now() - startedAt });
      throw new Error("Connection Timeout");
    } else {
      diagnostics.finish("http.error", { totalMs: Date.now() - startedAt });
      throw error;
    }
  }
}

export class SSETransform extends Transform {
  private parser = createParser((event: ParsedEvent | ReconnectInterval) => {
    if (event.type === "event") {
      this.push(event);
    }
  });
  private decoder = new TextDecoder();
  constructor(options: TransformOptions = { objectMode: true }) {
    super(options);
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, next: TransformCallback) {
    this.parser.feed(this.decoder.decode(chunk as ArrayBuffer));
    next();
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function getErrorText(err: any): string {
  if (err instanceof Array) {
    err = err[0];
  }
  if (typeof err === "string") {
    return err;
  }
  const { error } = err;
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object") {
    const { message } = error;
    if (message) {
      return message;
    }
    if (error.error) {
      if (error.error.message) return error.error.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "object") {
    const { detail } = err;
    if (detail) {
      return detail;
    }
  }
  return "Unexcept error";
}
