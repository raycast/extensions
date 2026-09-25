import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface, type Interface } from "node:readline";
import { expandHome, resolveCodexExecutable } from "./executable";
import { asRecord, asString } from "./conversations";
export { resolveCodexExecutable } from "./executable";

export type SandboxMode =
  "read-only" | "workspace-write" | "danger-full-access";

export type CodexEvent = {
  method: string;
  params: Record<string, unknown>;
};

type JsonRpcMessage = {
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { message?: string; code?: number; data?: unknown };
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class CodexAppServer {
  private process: ChildProcessWithoutNullStreams | null = null;
  private reader: Interface | null = null;
  private nextRequestId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly onEvent: (event: CodexEvent) => void;
  private readonly sandbox: SandboxMode;
  private readonly cwd?: string;
  private readonly codexPath?: string;
  private readonly liveSearch: boolean;
  private threadId: string | null = null;
  private activeTurnId: string | null = null;
  private stderr = "";
  private closed = false;
  private completedTurns = new Set<string>();
  private snapshot: Record<string, unknown> = {};

  constructor(options: {
    onEvent: (event: CodexEvent) => void;
    sandbox: SandboxMode;
    cwd?: string;
    codexPath?: string;
    liveSearch: boolean;
  }) {
    this.onEvent = options.onEvent;
    this.sandbox = options.sandbox;
    this.cwd = options.cwd?.trim() ? expandHome(options.cwd.trim()) : undefined;
    this.codexPath = options.codexPath?.trim() || undefined;
    this.liveSearch = options.liveSearch;
  }

  get currentThreadId(): string | null {
    return this.threadId;
  }

  get currentTurnId(): string | null {
    return this.activeTurnId;
  }

  get threadSnapshot(): Record<string, unknown> {
    return this.snapshot;
  }

  async connect(): Promise<void> {
    if (this.process) {
      return;
    }

    const executable = await resolveCodexExecutable(this.codexPath);
    if (this.closed) throw new Error("连接已关闭");
    const child = spawn(
      executable.command,
      [...(this.liveSearch ? ["--search"] : []), "app-server"],
      {
        cwd: this.cwd,
        env: executable.env,
        shell: executable.shell,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      },
    );

    this.process = child;
    child.stdin.on("error", (error) => this.rejectPending(error));
    this.reader = createInterface({ input: child.stdout });
    this.reader.on("line", (line) => this.handleLine(line));
    child.stderr.on("data", (chunk: Buffer | string) => {
      this.stderr += chunk.toString();
      if (this.stderr.length > 12_000) {
        this.stderr = this.stderr.slice(-12_000);
      }
    });
    child.on("error", (error) => {
      this.rejectPending(error);
      this.onEvent({
        method: "process/exited",
        params: { stderr: error.message },
      });
    });
    child.on("exit", (code, signal) => {
      const detail = this.stderr.trim();
      this.rejectPending(
        new Error(
          detail || `Codex app-server exited (${code ?? signal ?? "unknown"}).`,
        ),
      );
      this.onEvent({
        method: "process/exited",
        params: { code: code ?? null, signal: signal ?? null, stderr: detail },
      });
      this.process = null;
      this.reader = null;
      this.activeTurnId = null;
    });

    await this.request("initialize", {
      clientInfo: {
        name: "ask_codex_raycast",
        title: "Ask ChatGPT Raycast Extension",
        version: "1.0.0",
      },
    });
    this.notify("initialized", {});
  }

  async startThread(): Promise<string> {
    const result = await this.request("thread/start", this.threadParams());
    const thread = asRecord(result).thread;
    const id = asString(asRecord(thread).id);
    if (!id) {
      throw new Error("Codex app-server did not return a thread id.");
    }

    this.threadId = id;
    this.snapshot = asRecord(thread);
    this.activeTurnId = null;
    return id;
  }

  async resumeThread(threadId: string): Promise<string> {
    const result = await this.request("thread/resume", {
      threadId,
      // Preserve the original session's cwd and model instead of overriding them.
      sandbox: this.sandbox,
      approvalPolicy: "never",
    });
    const thread = asRecord(result).thread;
    const id = asString(asRecord(thread).id) || threadId;

    this.threadId = id;
    this.snapshot = asRecord(thread);
    const turns = Array.isArray(this.snapshot.turns) ? this.snapshot.turns : [];
    const active = turns
      .map(asRecord)
      .find((turn) => turn.status === "inProgress");
    this.activeTurnId = active ? asString(active.id) || null : null;
    return id;
  }

  async listThreads(
    cursor?: string,
    searchTerm?: string,
  ): Promise<{ data: Record<string, unknown>[]; nextCursor: string | null }> {
    const result = await this.request("thread/list", {
      limit: 30,
      sortKey: "updated_at",
      sourceKinds: ["cli", "vscode", "appServer"],
      ...(cursor ? { cursor } : {}),
      ...(searchTerm ? { searchTerm } : {}),
    });
    return {
      data: Array.isArray(result.data) ? result.data.map(asRecord) : [],
      nextCursor: asString(result.nextCursor) || null,
    };
  }

  async startTurn(prompt: string): Promise<void> {
    if (!this.threadId) {
      await this.startThread();
    }

    const result = await this.request("turn/start", {
      threadId: this.threadId,
      input: [{ type: "text", text: prompt }],
    });
    const turn = asRecord(result).turn;
    const id = asString(asRecord(turn).id);
    if (id && !this.completedTurns.has(id)) this.activeTurnId = id;
  }

  async steer(prompt: string): Promise<void> {
    if (!this.threadId || !this.activeTurnId) {
      throw new Error("There is no active Codex turn to steer.");
    }

    await this.request("turn/steer", {
      threadId: this.threadId,
      input: [{ type: "text", text: prompt }],
      expectedTurnId: this.activeTurnId,
    });
  }

  async interrupt(): Promise<void> {
    if (!this.threadId || !this.activeTurnId) {
      return;
    }

    await this.request("turn/interrupt", {
      threadId: this.threadId,
      turnId: this.activeTurnId,
    });
  }

  close(): void {
    this.closed = true;
    this.reader?.close();
    this.reader = null;
    this.rejectPending(new Error("Codex app-server connection closed."));
    const child = this.process;
    child?.stdin.end();
    if (child && child.exitCode === null) {
      const timer = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill();
      }, 800);
      timer.unref();
    }
    this.process = null;
  }

  private threadParams(): Record<string, unknown> {
    return {
      ...(this.cwd ? { cwd: this.cwd } : {}),
      sandbox: this.sandbox,
      approvalPolicy: "never",
      serviceName: "ask_codex_raycast",
    };
  }

  private request(
    method: string,
    params: unknown,
  ): Promise<Record<string, unknown>> {
    const id = this.nextRequestId++;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        const error = new Error(
          `Codex 请求超时（${method}）。请重新连接后重试。`,
        );
        // A timed-out send may have been accepted. Closing avoids duplicate turns on retry.
        this.onEvent({
          method: "process/exited",
          params: { stderr: error.message },
        });
        this.close();
        reject(error);
      }, 30_000);
      this.pending.set(id, {
        resolve: (value) => resolve(asRecord(value)),
        reject,
        timer,
      });
      try {
        this.write({ method, id, params });
      } catch (error) {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private notify(method: string, params: unknown): void {
    this.write({ method, params });
  }

  private write(message: Record<string, unknown>): void {
    if (!this.process?.stdin.writable) {
      throw new Error("Codex app-server is not connected.");
    }

    this.process.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private handleLine(line: string): void {
    if (!line.trim()) {
      return;
    }

    let message: JsonRpcMessage;
    try {
      message = JSON.parse(line) as JsonRpcMessage;
    } catch {
      return;
    }

    if (message.method && message.id !== undefined) {
      // Never silently auto-approve a tool request or leave the server hanging.
      this.write({
        id: message.id,
        error: {
          code: -32601,
          message: "此 Raycast 界面不支持交互式授权，请在 Codex CLI 中处理。",
        },
      });
      this.onEvent({
        method: "request/unsupported",
        params: { method: message.method },
      });
      return;
    }
    if (typeof message.id === "number") {
      const pending = this.pending.get(message.id);
      if (pending) {
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) {
          pending.reject(
            new Error(
              message.error.message ?? "Codex app-server request failed.",
            ),
          );
        } else {
          pending.resolve(message.result);
        }
        return;
      }
    }

    if (message.method) {
      const params = asRecord(message.params);
      if (params.threadId && this.threadId && params.threadId !== this.threadId)
        return;
      if (message.method === "turn/started") {
        this.activeTurnId =
          asString(asRecord(params.turn).id) || this.activeTurnId;
      } else if (message.method === "turn/completed") {
        const id = asString(asRecord(params.turn).id);
        this.completedTurns.add(id);
        if (this.completedTurns.size > 100)
          this.completedTurns.delete(
            this.completedTurns.values().next().value!,
          );
        if (!this.activeTurnId || this.activeTurnId === id)
          this.activeTurnId = null;
      }
      this.onEvent({ method: message.method, params });
    }
  }

  private rejectPending(error: Error): void {
    for (const [id, pending] of this.pending) {
      this.pending.delete(id);
      clearTimeout(pending.timer);
      pending.reject(error);
    }
  }
}
