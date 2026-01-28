import { createParser, type ParsedEvent, type ReconnectInterval } from "eventsource-parser";
import fetch, { RequestInit } from "node-fetch";
import { Transform, TransformCallback, TransformOptions } from "stream";

export const DEFAULT_TIMEOUT = 60 * 1000;
export async function* fetchSSE(input: string, options: RequestInit) {
  const { signal: originSignal, ...fetchOptions } = options;
  const timeout = DEFAULT_TIMEOUT;
  const ctrl = new AbortController();
  const { signal } = ctrl;
  if (originSignal) {
    originSignal.addEventListener("abort", () => ctrl.abort());
  }
  const timerId = setTimeout(() => {
    ctrl.abort();
  }, timeout);
  try {
    const resp = await fetch(input, { ...fetchOptions, signal });
    console.debug(`resp.status:${resp.status}`);
    clearTimeout(timerId);

    if (resp.status !== 200) {
      const errorBody = await resp.json();
      throw errorBody;
    }
    const rs = resp.body;
    if (rs) {
      yield* rs;
    }
  } catch (error) {
    console.debug(error);
    if (ctrl.signal.aborted) {
      throw new Error("Connection Timeout");
    } else {
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
