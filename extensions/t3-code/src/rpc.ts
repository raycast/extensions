/** A minimal client for the T3 Code WebSocket RPC. The server speaks Effect RPC with
 * JSON framing: one JSON message per frame, requests answered by an `Exit` message.
 * Only unary calls are supported, which is all this extension needs. */

export type RpcConnection = {
  call<T>(tag: string, payload: unknown, timeoutMs?: number): Promise<T>;
  close(): void;
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

const OPEN_TIMEOUT_MS = 10_000;
const CALL_TIMEOUT_MS = 60_000;

/** Pulls a readable message out of an encoded Effect cause. */
function describeCause(cause: unknown): string {
  const parts: string[] = [];
  const entries = Array.isArray(cause) ? cause : [cause];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const { error, defect } = entry as { error?: unknown; defect?: unknown };
    const detail = error ?? defect;
    if (detail && typeof detail === "object") {
      const { message, _tag } = detail as { message?: string; _tag?: string };
      parts.push(message ?? _tag ?? JSON.stringify(detail));
    } else if (detail !== undefined) {
      parts.push(String(detail));
    }
  }
  return parts.join("; ") || "The server rejected the request.";
}

export function openRpc(url: string): Promise<RpcConnection> {
  return new Promise((resolveOpen, rejectOpen) => {
    const socket = new WebSocket(url);
    const pending = new Map<string, Pending>();
    let nextId = 1;
    let opened = false;
    let closed = false;

    const failAll = (error: Error) => {
      for (const entry of pending.values()) {
        entry.reject(error);
      }
      pending.clear();
    };

    const openTimer = setTimeout(() => {
      if (!opened) {
        socket.close();
        rejectOpen(new Error("Timed out opening the T3 Code WebSocket."));
      }
    }, OPEN_TIMEOUT_MS);

    const handle = (message: unknown) => {
      if (!message || typeof message !== "object") {
        return;
      }
      const { _tag, requestId, exit } = message as {
        _tag?: string;
        requestId?: string;
        exit?: { _tag?: string; value?: unknown; cause?: unknown };
      };
      if (_tag === "Ping") {
        socket.send(JSON.stringify({ _tag: "Pong" }));
        return;
      }
      if (_tag !== "Exit" || requestId === undefined || !exit) {
        return;
      }
      const entry = pending.get(String(requestId));
      if (!entry) {
        return;
      }
      pending.delete(String(requestId));
      if (exit._tag === "Success") {
        entry.resolve(exit.value);
      } else {
        entry.reject(new Error(describeCause(exit.cause)));
      }
    };

    socket.onopen = () => {
      opened = true;
      clearTimeout(openTimer);
      resolveOpen({
        call: <T>(tag: string, payload: unknown, timeoutMs = CALL_TIMEOUT_MS) =>
          new Promise<T>((resolve, reject) => {
            if (closed) {
              reject(new Error("The T3 Code WebSocket is closed."));
              return;
            }
            const id = String(nextId++);
            const timer = setTimeout(() => {
              pending.delete(id);
              reject(
                new Error(
                  `T3 Code did not answer ${tag} in time. It may still have finished, so check T3 Code before sending again.`,
                ),
              );
            }, timeoutMs);
            pending.set(id, {
              resolve: (value) => {
                clearTimeout(timer);
                resolve(value as T);
              },
              reject: (error) => {
                clearTimeout(timer);
                reject(error);
              },
            });
            socket.send(
              JSON.stringify({
                _tag: "Request",
                id,
                tag,
                payload,
                headers: [],
              }),
            );
          }),
        close: () => socket.close(),
      });
    };

    socket.onmessage = (event) => {
      try {
        const parsed: unknown = JSON.parse(String(event.data));
        for (const message of Array.isArray(parsed) ? parsed : [parsed]) {
          handle(message);
        }
      } catch {
        // a frame this client cannot read is not an answer to anything it asked
      }
    };

    socket.onerror = () => {
      if (!opened) {
        clearTimeout(openTimer);
        rejectOpen(new Error("Could not open the T3 Code WebSocket."));
      }
    };

    socket.onclose = () => {
      closed = true;
      clearTimeout(openTimer);
      if (!opened) {
        rejectOpen(new Error("The T3 Code WebSocket closed before it opened."));
      }
      failAll(new Error("The T3 Code WebSocket closed mid-request."));
    };
  });
}
