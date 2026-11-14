import {
  spawn,
  execFile,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, delimiter } from "node:path";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import type { CodexEvent, CodexModel, ModelSelection } from "./codex";
import { expandHome, envValue, executableEnv } from "./executable";
import { asRecord, asString } from "./conversations";

type SessionStore = {
  get(id: string): Promise<string | undefined>;
  set(id: string, remote: string): Promise<void>;
};
type Options = {
  onEvent(event: CodexEvent): void;
  cwd?: string;
  agyPath?: string;
  sessions: SessionStore;
};

export function parseAgyModels(output: string): CodexModel[] {
  return output.split(/\r?\n/).flatMap((line) => {
    const [model, ...name] = line.trim().split("\t");
    return name.length && /^[\w./-]+$/.test(model)
      ? [
          {
            model,
            displayName: name.join(" ").trim() || model,
            efforts: [],
            defaultEffort: "",
          },
        ]
      : [];
  });
}

function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<string> {
  return new Promise((resolve, reject) =>
    execFile(
      command,
      args,
      { env, timeout: 25_000, maxBuffer: 1024 * 1024, windowsHide: true },
      (error, stdout) =>
        error
          ? reject(
              new Error(
                "Antigravity CLI could not complete the connection check. Open agy in your terminal and check its sign-in.",
              ),
            )
          : resolve(stdout),
    ),
  );
}

export async function resolveAgyExecutable(
  explicit?: string,
): Promise<{ command: string; env: NodeJS.ProcessEnv }> {
  const env = executableEnv([
    join(homedir(), ".local", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ]);
  const requested = explicit?.trim();
  const candidates = requested
    ? [expandHome(requested)]
    : [
        join(
          homedir(),
          ".local",
          "bin",
          process.platform === "win32" ? "agy.exe" : "agy",
        ),
        ...(process.platform === "win32"
          ? [
              join(
                envValue(process.env, "LOCALAPPDATA") ||
                  join(homedir(), "AppData", "Local"),
                "agy",
                "bin",
                "agy.exe",
              ),
            ]
          : []),
        "/opt/homebrew/bin/agy",
        "/usr/local/bin/agy",
      ];
  if (!requested) {
    try {
      candidates.push(
        ...(
          await run(
            process.platform === "win32" ? "where.exe" : "/usr/bin/which",
            ["agy"],
            env,
          )
        )
          .trim()
          .split(/\r?\n/),
      );
    } catch {
      /* Try standard paths. */
    }
  }
  for (const command of candidates) {
    // Shell wrappers are deliberately excluded: prompts must remain literal argv.
    if (/\.(cmd|bat|ps1)$/i.test(command)) continue;
    try {
      accessSync(
        command,
        process.platform === "win32" ? constants.F_OK : constants.X_OK,
      );
      if (!statSync(command).isFile()) continue;
      return {
        command,
        env: { ...env, PATH: [dirname(command), env.PATH].join(delimiter) },
      };
    } catch {
      /* Try next executable. */
    }
  }
  throw new Error(
    "Antigravity CLI (agy) was not found. Install and sign in to agy, or set Antigravity Path to its native executable.",
  );
}

/** One explicit AGY conversation per local thread; never resumes the CLI's latest session. */
export class AntigravityClient {
  private executable: Awaited<ReturnType<typeof resolveAgyExecutable>> | null =
    null;
  private child: ChildProcessWithoutNullStreams | null = null;
  private threadId: string | null = null;
  private remoteId: string | undefined;
  private turnId: string | null = null;
  private selection: ModelSelection = { model: "", effort: "" };
  private closed = false;
  private stop: (() => void) | null = null;
  private stopped: Promise<void> = Promise.resolve();
  private catalog: CodexModel[] = [];
  constructor(private readonly options: Options) {}
  get currentThreadId() {
    return this.threadId;
  }
  get currentTurnId() {
    return this.turnId;
  }
  get currentModelSelection() {
    return { ...this.selection };
  }
  get threadSnapshot(): Record<string, unknown> {
    return { cwd: this.options.cwd || "", turns: [] };
  }
  async connect() {
    this.executable = await resolveAgyExecutable(this.options.agyPath);
    if (this.closed) throw new Error("Connection closed");
  }
  async checkAuthentication() {
    if (!(await this.listModels()).length)
      throw new Error(
        "No Antigravity models available. Open agy in your terminal and sign in.",
      );
  }
  async listModels() {
    if (this.closed || !this.executable)
      throw new Error("Antigravity is not connected");
    this.catalog = [];
    this.catalog = parseAgyModels(
      await run(this.executable.command, ["models"], this.executable.env),
    );
    return this.catalog;
  }
  async startThread() {
    if (this.closed) throw new Error("Connection closed");
    if (this.child || this.turnId)
      throw new Error(
        "Stop the active response before starting another session.",
      );
    this.threadId = `antigravity:${randomUUID()}`;
    this.remoteId = undefined;
    return this.threadId;
  }
  async resumeThread(id: string) {
    if (this.closed) throw new Error("Connection closed");
    if (this.child || this.turnId)
      throw new Error("Stop the active response before switching sessions.");
    if (
      !/^antigravity:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        id,
      )
    )
      throw new Error("This session belongs to a different CLI.");
    const remote = await this.options.sessions.get(id);
    if (this.closed) throw new Error("Connection closed");
    if (!remote)
      throw new Error(
        "Antigravity session mapping is unavailable. Start a new session.",
      );
    this.threadId = id;
    this.remoteId = remote;
    return id;
  }
  async startTurn(prompt: string, selection?: ModelSelection | null) {
    if (this.closed || !this.executable)
      throw new Error("Antigravity is not connected");
    if (this.child || this.turnId)
      throw new Error(
        "Wait for Antigravity to finish, or stop its current response.",
      );
    if (selection?.effort)
      throw new Error(
        "Antigravity does not publish per-model reasoning choices. Select its advertised model variant instead.",
      );
    if (!this.threadId) await this.startThread();
    if (this.closed || this.child || this.turnId)
      throw new Error("Antigravity is not ready for another turn.");
    if (
      !selection?.model ||
      !this.catalog.some((m) => m.model === selection.model)
    )
      throw new Error("Select an available Antigravity model before sending.");
    this.selection = { model: selection.model, effort: "" };
    const threadId = this.threadId!;
    const turnId = randomUUID();
    const itemId = randomUUID();
    const args = [
      "--model",
      selection.model,
      "--sandbox",
      "--mode",
      "plan",
      "--disable-slash-commands",
      "--output-format",
      "stream-json",
      "--print-timeout",
      "300s",
      ...(this.remoteId
        ? ["--conversation", this.remoteId]
        : ["--new-project"]),
      "--print",
      prompt,
    ];
    const child = spawn(this.executable.command, args, {
      env: this.executable.env,
      cwd: this.options.cwd ? expandHome(this.options.cwd) : homedir(),
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      detached: process.platform !== "win32",
    });
    this.child = child;
    this.turnId = turnId;
    let resolveStopped!: () => void;
    this.stopped = new Promise((resolve) => {
      resolveStopped = resolve;
    });
    const reader = createInterface({ input: child.stdout });
    let done = false,
      exited = false,
      bytes = 0,
      resultSeen = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    let completion: { status: string; error?: string } | undefined;
    let persist = Promise.resolve();
    let persistenceSettled = true;
    let observedRemote = this.remoteId;
    const emit = (method: string, params: Record<string, unknown>) =>
      this.options.onEvent({ method, params: { threadId, turnId, ...params } });
    const terminate = (signal: NodeJS.Signals) => {
      if (child.pid && process.platform !== "win32") {
        try {
          process.kill(-child.pid, signal);
        } catch {
          /* Already exited. */
        }
      } else if (child.pid) {
        execFile(
          "taskkill.exe",
          ["/PID", String(child.pid), "/T", "/F"],
          { windowsHide: true },
          () => {},
        );
      }
    };
    const complete = () => {
      if (!completion || !exited || !persistenceSettled) return;
      const { status, error } = completion;
      completion = undefined;
      this.turnId = null;
      this.stop = null;
      emit("turn/completed", {
        turn: {
          id: turnId,
          status,
          ...(error ? { error: { message: error } } : {}),
        },
      });
      resolveStopped();
    };
    const finish = (status: string, error?: string) => {
      if (done) return;
      done = true;
      completion = { status, error };
      clearTimeout(timer);
      reader.close();
      if (child.exitCode === null && child.signalCode === null) {
        terminate("SIGTERM");
        killTimer = setTimeout(() => {
          terminate("SIGKILL");
        }, 1500);
        killTimer.unref();
      }
      complete();
    };
    const timer = setTimeout(
      () =>
        finish(
          "failed",
          "Antigravity timed out. You can retry or continue in agy.",
        ),
      310_000,
    );
    this.stop = () => {
      if (done) terminate("SIGKILL");
      else finish("interrupted");
    };
    child.stdin.end();
    child.stdin.on("error", () => {});
    child.stderr.on("data", () => {}); // Drain stderr; it can contain private CLI diagnostics.
    emit("turn/started", { turn: { id: turnId } });
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 16 * 1024 * 1024)
        finish("failed", "Antigravity output exceeded the supported size.");
    });
    reader.on("line", (line) => {
      if (done) return;
      let data: Record<string, unknown>;
      try {
        data = asRecord(JSON.parse(line));
      } catch {
        return;
      }
      if (data.event === "init") {
        const remote = asString(data.conversation_id);
        if (!remote) {
          finish("failed", "Antigravity did not return a conversation ID.");
          return;
        }
        if (observedRemote && remote !== observedRemote) {
          finish(
            "failed",
            "Antigravity returned a different conversation. The saved session was not changed.",
          );
          return;
        }
        if (observedRemote) return;
        observedRemote = remote;
        persistenceSettled = false;
        persist = new Promise<void>((resolve, reject) => {
          const deadline = setTimeout(
            () => reject(new Error("Session save timed out")),
            5000,
          );
          Promise.resolve()
            .then(() => this.options.sessions.set(threadId, remote))
            .then(resolve, reject)
            .finally(() => clearTimeout(deadline));
        })
          .then(() => {
            if (this.threadId === threadId) this.remoteId = remote;
          })
          .catch(() => {
            if (completion)
              completion = {
                status: "failed",
                error:
                  "Could not save the Antigravity session. Start a new session.",
              };
            finish(
              "failed",
              "Could not save the Antigravity session. Try again.",
            );
          })
          .finally(() => {
            persistenceSettled = true;
            complete();
          });
      }
      if (data.event === "step_update") {
        const step = asRecord(data.step_update);
        if (
          step.step_type === "agent_response" &&
          typeof step.text_delta === "string"
        )
          emit("item/agentMessage/delta", { itemId, delta: step.text_delta });
        if (
          /permission|approval|user_input_required/i.test(
            asString(step.step_type),
          )
        )
          finish(
            "failed",
            "Antigravity needs interactive approval. Continue this conversation in agy.",
          );
      }
      if (data.event === "result") {
        resultSeen = true;
        const result = asRecord(data.result);
        void persist.then(() => {
          if (done) return;
          if (
            !this.remoteId ||
            (result.conversation_id && result.conversation_id !== this.remoteId)
          ) {
            finish(
              "failed",
              "Antigravity did not confirm the expected conversation ID.",
            );
            return;
          }
          if (result.status === "SUCCESS") {
            emit("item/completed", {
              item: {
                id: itemId,
                type: "agentMessage",
                text: asString(result.response),
              },
            });
            finish("completed");
          } else
            finish(
              "failed",
              "Antigravity could not complete the response. Check the conversation in agy.",
            );
        });
      }
    });
    child.on("error", () =>
      finish("failed", "Could not launch Antigravity CLI."),
    );
    child.on("close", () => {
      if (process.platform !== "win32") terminate("SIGKILL");
      exited = true;
      clearTimeout(killTimer);
      if (this.child === child) this.child = null;
      if (!resultSeen)
        finish("failed", "Antigravity exited before completing the response.");
      complete();
    });
  }
  async steer(): Promise<void> {
    throw new Error(
      "Antigravity does not support steering here. Stop the response or wait for it to finish.",
    );
  }
  async interrupt() {
    if (!this.child && !this.turnId) return;
    this.stop?.();
    await new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(
        () =>
          reject(
            new Error(
              "Antigravity has not stopped yet. Close it in your terminal before continuing.",
            ),
          ),
        12_000,
      );
      this.stopped.then(resolve, reject).finally(() => clearTimeout(deadline));
    });
  }
  close() {
    this.closed = true;
    this.stop?.();
  }
}
