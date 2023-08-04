import { createParser } from "eventsource-parser";
import fetch, { RequestInit } from "node-fetch";

export interface FetchSSEOptions extends RequestInit {
  onMessage(data: string): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError(error: any): void;
}

export async function fetchSSE(input: string, options: FetchSSEOptions) {
  const { onMessage, onError, signal: originSignal, ...fetchOptions } = options;
  const timeout = 15 * 1000;
  let abortByTimeout = false;
  try {
    const ctrl = new AbortController();
    const { signal } = ctrl;
    if (originSignal) {
      originSignal.addEventListener("abort", () => ctrl.abort());
    }
    const timerId = setTimeout(() => {
      abortByTimeout = true;
      ctrl.abort();
    }, timeout);

    const resp = await fetch(input, { ...fetchOptions, signal });

    clearTimeout(timerId);

    if (resp.status !== 200) {
      onError(await resp.json());
      return;
    }
    const parser = createParser((event) => {
      if (event.type === "event") {
        onMessage(event.data);
      }
    });
    if (resp.body) {
      for await (const chunk of resp.body) {
        if (chunk) {
          const str = new TextDecoder().decode(chunk as ArrayBuffer);
          parser.feed(str);
        }
      }
    }
  } catch (error) {
    if (abortByTimeout) {
      onError({ error: { message: "Connection Timeout" } });
    } else {
      onError({ error });
    }
  }
}
/* eslint-disable @typescript-eslint/no-explicit-any */
export function getErrorText(err: any): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  if (typeof err === "object") {
    const { detail } = err;
    if (detail) {
      return detail;
    }
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
  }
  return "Unexcept error";
}
