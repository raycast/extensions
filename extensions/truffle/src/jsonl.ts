import net from "node:net";

type Reply = Record<string, unknown>;
type Pending = { resolve: (reply: Reply) => void; reject: (error: Error) => void; timer: NodeJS.Timeout };

/**
 * One JSON request per line over a Unix socket, answers matched by `id`. Lines without a pending `id`
 * (events) go to `onEvent`. Both fsearch's daemon and the DigUp bridge speak this.
 */
export class JsonLinesClient {
  private socket?: net.Socket;
  private connecting?: Promise<net.Socket>;
  private buffer = "";
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor(
    private readonly path: string,
    private readonly onEvent?: (event: Reply) => void,
  ) {}

  async request(body: Reply, timeoutMs = 10_000): Promise<Reply> {
    const socket = await this.connect();
    const id = this.nextId++;
    return new Promise<Reply>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`no answer from ${this.path} within ${timeoutMs} ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      socket.write(JSON.stringify({ ...body, id }) + "\n");
    });
  }

  close(): void {
    this.socket?.end();
    this.fail(new Error("closed"));
  }

  private connect(): Promise<net.Socket> {
    if (this.socket && !this.socket.destroyed) return Promise.resolve(this.socket);
    this.connecting ??= new Promise<net.Socket>((resolve, reject) => {
      const socket = net.createConnection(this.path);
      socket.setEncoding("utf8");
      socket.once("connect", () => {
        this.socket = socket;
        this.connecting = undefined;
        resolve(socket);
      });
      socket.once("error", (error) => {
        this.connecting = undefined;
        this.socket = undefined;
        this.fail(error);
        reject(error);
      });
      socket.on("close", () => {
        this.socket = undefined;
        // A reply cut off by the daemon going away must not prefix the next connection's first line.
        this.buffer = "";
        this.fail(new Error("connection closed"));
      });
      socket.on("data", (chunk: string) => this.read(chunk));
    });
    return this.connecting;
  }

  private read(chunk: string): void {
    this.buffer += chunk;
    let newline: number;
    while ((newline = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      if (!line.trim()) continue;
      let reply: Reply;
      try {
        reply = JSON.parse(line) as Reply;
      } catch {
        continue;
      }
      const id = typeof reply.id === "number" ? reply.id : undefined;
      const waiting = id === undefined ? undefined : this.pending.get(id);
      if (waiting && id !== undefined) {
        this.pending.delete(id);
        clearTimeout(waiting.timer);
        waiting.resolve(reply);
      } else {
        this.onEvent?.(reply);
      }
    }
  }

  private fail(error: Error): void {
    for (const [id, waiting] of this.pending) {
      clearTimeout(waiting.timer);
      waiting.reject(error);
      this.pending.delete(id);
    }
  }
}
