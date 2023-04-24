import { createParser } from "eventsource-parser";
import fetch, { RequestInit } from "node-fetch";
import { isReadable, Readable } from "stream";

interface FetchSSEOptions extends RequestInit {
  onMessage(data: string): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError(error: any): void;
}

export async function fetchSSE(input: string, options: FetchSSEOptions) {
  const proxy = "socks5://localhost:1080";

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
