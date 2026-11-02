import net from "node:net";
import type { HelloParams, Method, Methods } from "./types";

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * A failed call. `code` is Leaf Calendar's `data.code` (`not_found`, `read_only`, ...), or one of ours:
 * `not_running` (no pipe), `timeout`, `disconnected`, `invalid_params` (-32602), `failed` (any other JSON-RPC error).
 */
export class LeafError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "LeafError";
  }
}

/** Sends `leaf.hello` with these params and resolves with Leaf Calendar's answer. */
export type SendHello = (params: HelloParams) => Promise<unknown>;

export type LeafClientOptions = {
  path: string;
  /** Sends the hello itself, so it can sign in when Leaf Calendar answers `approval_needed`. */
  hello: (send: SendHello) => Promise<unknown>;
  timeoutMs?: number;
};

type Pending = { resolve: (value: unknown) => void; reject: (error: LeafError) => void; timer: NodeJS.Timeout };

type RpcError = { code: number; message: string; data?: { code?: string } };

/** Leaf Calendar's pipe for a Windows user: `leaf-calendar-<user>`, lowercase. */
export function pipePath(username: string): string {
  return `\\\\.\\pipe\\leaf-calendar-${username.toLowerCase()}`;
}

/**
 * One connection to Leaf Calendar. It connects on the first call, sends `leaf.hello` first (so the approval window shows our
 * icon), then answers calls in order. A dropped connection fails what's waiting and reconnects on the next call.
 */
export class LeafClient {
  private socket?: net.Socket;
  private connecting?: Promise<void>;
  private pending = new Map<number, Pending>();
  private buffer = "";
  private nextId = 1;

  constructor(private readonly options: LeafClientOptions) {}

  async call<M extends Method>(method: M, params?: Methods[M]["params"]): Promise<Methods[M]["result"]> {
    await this.connect();
    return (await this.send(
      method,
      params ?? {},
      this.options.timeoutMs ?? REQUEST_TIMEOUT_MS,
    )) as Methods[M]["result"];
  }

  close(): void {
    this.socket?.end();
    this.socket = undefined;
    this.connecting = undefined;

    // Fail What's Waiting, Since No Answer Can Arrive Now
    this.buffer = "";
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new LeafError("disconnected", "Leaf Calendar closed the connection."));
      this.pending.delete(id);
    }
  }

  private connect(): Promise<void> {
    this.connecting ??= this.open().catch((error) => {
      this.close();
      throw error;
    });
    return this.connecting;
  }

  private async open(): Promise<void> {
    const socket = await new Promise<net.Socket>((resolve, reject) => {
      const s = net.connect(this.options.path);
      s.once("connect", () => resolve(s));
      s.once("error", (error: NodeJS.ErrnoException) => reject(transportError(error)));
    });

    // Lines In, Failures Out
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      if (this.socket === socket) {
        this.receive(chunk);
      }
    });
    socket.on("error", () => undefined);
    socket.on("close", () => this.dropped(socket));
    this.socket = socket;

    await this.options.hello((params) => this.send("leaf.hello", params, this.options.timeoutMs ?? REQUEST_TIMEOUT_MS));
  }

  private send(method: string, params: object, timeoutMs: number): Promise<unknown> {
    const socket = this.socket;
    if (!socket) {
      return Promise.reject(new LeafError("disconnected", "Leaf Calendar closed the connection."));
    }

    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new LeafError("timeout", "Leaf Calendar didn't answer in time."));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      socket.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  }

  private receive(chunk: string): void {
    this.buffer += chunk;
    let newline: number;
    while ((newline = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line) {
        this.answer(line);
      }
    }
  }

  private answer(line: string): void {
    let message: { id?: unknown; result?: unknown; error?: RpcError };
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }

    const pending = typeof message.id === "number" ? this.pending.get(message.id) : undefined;
    if (!pending) {
      return;
    }

    this.pending.delete(message.id as number);
    clearTimeout(pending.timer);
    if (message.error) {
      pending.reject(rpcError(message.error));
    } else {
      pending.resolve(message.result);
    }
  }

  // An Old Connection Closing Late Leaves The Current One Alone
  private dropped(socket: net.Socket): void {
    if (this.socket === socket) {
      this.close();
    }
  }
}

function rpcError(error: RpcError): LeafError {
  const code = error.data?.code ?? (error.code === -32602 ? "invalid_params" : "failed");
  return new LeafError(code, error.message);
}

function transportError(error: NodeJS.ErrnoException): LeafError {
  return error.code === "ENOENT"
    ? new LeafError("not_running", "Leaf Calendar isn't running, or other apps aren't allowed to connect.")
    : new LeafError("disconnected", "Couldn't connect to Leaf Calendar.");
}
