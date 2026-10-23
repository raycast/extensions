import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { FolnaroError, classifyToolError } from "./errors";

/**
 * A small MCP client for folnaro-mcp over stdio (newline-delimited JSON-RPC 2.0).
 *
 * One helper process per command invocation: `start()` spawns it and runs the `initialize`
 * handshake (legacy session, docs/mcp/README.md "Protocol"), every request after that reuses the
 * session, and `close()` ends it. The helper reads the permissions and the entitlement fresh on
 * every request, so a long-lived session never sees stale switches.
 */

/** The revision this client speaks. The helper answers with it (it supports it) or 2025-11-25. */
export const PROTOCOL_VERSION = "2025-11-25";

export interface McpClientOptions {
  /** Executable to start, usually `<Folnaro.app>/Contents/MacOS/folnaro-mcp`. */
  command: string;
  args?: string[];
  /** Extra environment, e.g. `FOLNARO_LANGUAGE`. Merged over `process.env`. */
  env?: Record<string, string | undefined>;
  clientName?: string;
  clientVersion?: string;
  /** Time for spawn plus handshake, in ms. */
  startTimeoutMs?: number;
  /** Default time per request, in ms. */
  requestTimeoutMs?: number;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  method: string;
}

interface RpcMessage {
  jsonrpc?: string;
  id?: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  method?: string;
}

/** One content block of a tool result. */
export interface ContentBlock {
  type: string;
  text?: string;
  resource?: { uri: string; mimeType?: string; blob?: string; text?: string };
}

export interface ToolResult<T> {
  /** `structuredContent`, or the JSON of the first text block for older revisions. */
  data: T;
  content: ContentBlock[];
}

interface RawToolResult {
  content?: ContentBlock[];
  structuredContent?: unknown;
  isError?: boolean;
}

export interface ServerInfo {
  protocolVersion: string;
  serverInfo?: { name: string; title?: string; version: string };
}

const STDERR_TAIL = 4000;

/** What `FolnaroApi` needs from a client; tests and the "helper not found" case provide their own. */
export interface ToolClient {
  listToolNames(): Promise<Set<string>>;
  callTool<T>(name: string, args?: Record<string, unknown>, timeoutMs?: number): Promise<ToolResult<T>>;
  close(): void;
}

export class McpClient implements ToolClient {
  private readonly options: Required<Omit<McpClientOptions, "env" | "args">> & Pick<McpClientOptions, "env" | "args">;
  private child?: ChildProcessWithoutNullStreams;
  private buffer = "";
  private stderr = "";
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private exitError?: FolnaroError;
  private starting?: Promise<ServerInfo>;
  private closed = false;

  constructor(options: McpClientOptions) {
    this.options = {
      clientName: "raycast-folnaro",
      clientVersion: "1.0.0",
      startTimeoutMs: 8000,
      requestTimeoutMs: 15000,
      ...options,
    };
  }

  /** Spawns the helper and runs the handshake once; later calls return the same promise. */
  start(): Promise<ServerInfo> {
    if (!this.starting) {
      this.starting = this.spawnAndInitialize();
      // A failed start stays failed for this client; the command shows the error.
    }
    return this.starting;
  }

  private async spawnAndInitialize(): Promise<ServerInfo> {
    const child = spawn(this.options.command, this.options.args ?? [], {
      env: { ...process.env, ...this.options.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child = child;

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => this.onStdout(chunk));
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      this.stderr = (this.stderr + chunk).slice(-STDERR_TAIL);
    });
    // Writing to a helper that already exited raises EPIPE on stdin; the exit handler reports it.
    child.stdin.on("error", () => undefined);

    const spawned = new Promise<void>((resolve, reject) => {
      child.once("spawn", () => resolve());
      child.once("error", (error: NodeJS.ErrnoException) => {
        const kind = error.code === "ENOENT" || error.code === "EACCES" ? "helperMissing" : "helperExited";
        const failure = new FolnaroError(kind, `Could not start ${this.options.command}: ${error.message}`);
        this.fail(failure);
        reject(failure);
      });
    });
    child.once("exit", (code, signal) => {
      if (this.closed) return;
      this.fail(
        new FolnaroError("helperExited", `folnaro-mcp exited (${signal ?? `status ${code}`}).`, {
          stderr: this.stderr.trim() || undefined,
        }),
      );
    });

    await spawned;
    const result = (await this.send(
      "initialize",
      {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: this.options.clientName, version: this.options.clientVersion },
      },
      this.options.startTimeoutMs,
    )) as ServerInfo;
    this.notify("notifications/initialized");
    return result;
  }

  /** Sends a request after the handshake. */
  async request<T = unknown>(method: string, params: Record<string, unknown> = {}, timeoutMs?: number): Promise<T> {
    await this.start();
    return (await this.send(method, params, timeoutMs ?? this.options.requestTimeoutMs)) as T;
  }

  /** Names of the tools the user currently allows (tools/list depends on the permissions). */
  async listToolNames(): Promise<Set<string>> {
    const result = await this.request<{ tools: { name: string }[] }>("tools/list");
    return new Set(result.tools.map((tool) => tool.name));
  }

  /**
   * Calls a tool. A result with `isError: true` becomes a classified `FolnaroError`
   * (permission, read-only mode, business rule), so callers only see successful data.
   */
  async callTool<T>(name: string, args: Record<string, unknown> = {}, timeoutMs?: number): Promise<ToolResult<T>> {
    const raw = await this.request<RawToolResult>("tools/call", { name, arguments: args }, timeoutMs);
    const content = raw.content ?? [];
    if (raw.isError) {
      const message = content.find((block) => block.type === "text")?.text ?? "";
      throw classifyToolError(name, message);
    }
    let data = raw.structuredContent as T | undefined;
    if (data === undefined) {
      const text = content.find((block) => block.type === "text")?.text;
      try {
        data = text ? (JSON.parse(text) as T) : undefined;
      } catch {
        throw new FolnaroError("protocol", `Unreadable result of ${name}.`, { tool: name });
      }
    }
    if (data === undefined) {
      throw new FolnaroError("protocol", `Empty result of ${name}.`, { tool: name });
    }
    return { data, content };
  }

  /** Ends the helper: closes stdin (the helper exits on EOF), then kills it if it lingers. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new FolnaroError("helperExited", "The connection to Folnaro was closed."));
    }
    this.pending.clear();
    const child = this.child;
    if (!child) return;
    child.stdin.end();
    if (child.exitCode === null && child.signalCode === null) {
      const killer = setTimeout(() => child.kill("SIGTERM"), 500);
      killer.unref?.();
      child.once("exit", () => clearTimeout(killer));
    }
  }

  // MARK: - Transport

  private send(method: string, params: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
    if (this.exitError) return Promise.reject(this.exitError);
    if (this.closed || !this.child) {
      return Promise.reject(new FolnaroError("helperExited", "The connection to Folnaro was closed."));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new FolnaroError("timeout", `folnaro-mcp did not answer ${method} within ${timeoutMs} ms.`, {
            stderr: this.stderr.trim() || undefined,
          }),
        );
        // A helper that hangs on one request is not trusted with the next one.
        if (method === "initialize") this.close();
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer, method });
      this.child?.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  }

  private notify(method: string, params?: Record<string, unknown>): void {
    if (this.closed || !this.child) return;
    const message: Record<string, unknown> = { jsonrpc: "2.0", method };
    if (params) message.params = params;
    this.child.stdin.write(JSON.stringify(message) + "\n");
  }

  private onStdout(chunk: string): void {
    this.buffer += chunk;
    let newline = this.buffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line) this.onLine(line);
      newline = this.buffer.indexOf("\n");
    }
  }

  private onLine(line: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      return; // Not ours to answer; stdout belongs to the protocol, so this should not happen.
    }
    for (const message of Array.isArray(parsed) ? parsed : [parsed]) {
      this.onMessage(message as RpcMessage);
    }
  }

  private onMessage(message: RpcMessage): void {
    if (typeof message.id !== "number") return; // notifications from the server are not used
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) {
      pending.reject(new FolnaroError("protocol", message.error.message, { code: message.error.code }));
    } else {
      pending.resolve(message.result);
    }
  }

  private fail(error: FolnaroError): void {
    this.exitError = error;
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}
