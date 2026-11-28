export class AgentHttpError extends Error {
  constructor(public readonly status: number) {
    super(
      `Agent server returned HTTP ${status}. Check its address, credentials, and enabled API features.`,
    );
  }
}

export async function agentFetch(
  url: string,
  secret: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () =>
      controller.abort(
        new Error("Agent server did not respond within 20 seconds."),
      ),
    20_000,
  );
  try {
    const response = await fetch(url, {
      ...init,
      redirect: "error",
      signal: init.signal
        ? AbortSignal.any([init.signal, controller.signal])
        : controller.signal,
      headers: {
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new AgentHttpError(response.status);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function agentJson(
  url: string,
  secret: string,
  init: RequestInit = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error("Agent JSON response timed out.")),
    20_000,
  );
  try {
    const response = await agentFetch(url, secret, {
      ...init,
      signal: init.signal
        ? AbortSignal.any([init.signal, controller.signal])
        : controller.signal,
    });
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export interface ServerEvent {
  id?: string;
  event?: string;
  data: unknown;
}

export async function readAgentEvents(
  body: ReadableStream<Uint8Array>,
  consume: (event: ServerEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let idleTimer: ReturnType<typeof setTimeout>;
  let idle = false;
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      idle = true;
      void reader.cancel();
    }, 35_000);
  }
  const abort = () => void reader.cancel();
  signal.addEventListener("abort", abort, { once: true });
  function frame(text: string) {
    const lines = text.split("\n");
    const data = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""))
      .join("\n");
    if (!data) return;
    consume({
      id: lines
        .find((line) => line.startsWith("id:"))
        ?.slice(3)
        .trim(),
      event: lines
        .find((line) => line.startsWith("event:"))
        ?.slice(6)
        .trim(),
      data: JSON.parse(data),
    });
  }
  try {
    resetIdle();
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      resetIdle();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      // Normalize CRLF after concatenation too, including split network chunks.
      buffer = buffer.replace(/\r\n/g, "\n");
      if (buffer.length > 1_048_576)
        throw new Error("Agent event exceeded the 1 MiB limit.");
      let end: number;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        frame(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
      }
      if (done) {
        if (buffer.trim()) frame(buffer);
        if (idle) throw new Error("Agent event stream timed out.");
        break;
      }
    }
    signal.throwIfAborted();
  } finally {
    clearTimeout(idleTimer!);
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function delay(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(done, ms);
    function done() {
      signal.removeEventListener("abort", abort);
      resolve();
    }
    function abort() {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}
