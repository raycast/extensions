import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { OSA_TIMEOUT_MS } from "./applescript";
import { getNativeExecutable, nativeHelperArguments } from "./swift-package";
import { isRetainedTabId } from "./browser-tab-id";

const MAX_RESPONSE_LENGTH = 10 * 1024 * 1024;
const SESSION_ENDED_MESSAGE = "Browser session ended. Refresh the list.";
const sessions = new Map<string, BrowserHelperSession>();

interface QueuedRequest {
  args: string[];
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}

interface PendingRequest extends QueuedRequest {
  timer: NodeJS.Timeout;
}

/** One process per browser; slow apps cannot block other browsers using the same engine. */
class BrowserHelperSession {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly onHostExit = () => this.child.kill();
  private readonly focusRequests: QueuedRequest[] = [];
  private readonly otherRequests: QueuedRequest[] = [];
  private buffer = "";
  private stopped = false;
  private pending?: PendingRequest;

  constructor(
    binary: string,
    private readonly key: string,
    name: string,
  ) {
    this.child = spawn(binary, nativeHelperArguments(name, ["serve"]), { stdio: "pipe" });
    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk: string) => this.receiveOutput(chunk));
    // Drain diagnostic output without retaining browsing data.
    this.child.stderr.on("data", () => {});
    this.child.on("error", () => this.stop(new Error("Unable to start browser helper. Refresh the list.")));
    this.child.on("exit", () => this.stop(new Error(SESSION_ENDED_MESSAGE)));
    this.child.stdin.on("error", () => this.stop(new Error(SESSION_ENDED_MESSAGE)));
    process.once("exit", this.onHostExit);
  }

  /** Keep one active command, giving focus priority over scans that have not started. */
  request(args: string[], signal?: AbortSignal): Promise<string> {
    if (this.stopped) return Promise.reject(new Error(SESSION_ENDED_MESSAGE));
    return new Promise<string>((resolve, reject) => {
      signal?.throwIfAborted();
      const queue = args[0] === "focus" ? this.focusRequests : this.otherRequests;
      const request: QueuedRequest = {
        args,
        resolve: (value) => {
          cleanup();
          resolve(value);
        },
        reject: (error) => {
          cleanup();
          reject(error);
        },
      };
      const cancel = () => {
        const index = queue.indexOf(request);
        if (index >= 0) queue.splice(index, 1);
        // Active responses still belong to this session and must be consumed.
        request.reject(signal!.reason);
      };
      const cleanup = () => signal?.removeEventListener("abort", cancel);
      signal?.addEventListener("abort", cancel, { once: true });
      queue.push(request);
      this.sendNextRequest();
    });
  }

  private sendNextRequest(): void {
    if (this.pending || this.stopped) return;
    const request = this.focusRequests.shift() ?? this.otherRequests.shift();
    if (!request) return;
    const timer = setTimeout(() => this.stop(new Error("Browser helper timed out. Refresh the list.")), OSA_TIMEOUT_MS);
    this.pending = { ...request, timer };
    try {
      this.child.stdin.write(JSON.stringify(request.args) + "\n");
    } catch {
      this.stop(new Error(SESSION_ENDED_MESSAGE));
    }
  }

  private receiveOutput(chunk: string): void {
    this.buffer += chunk;
    if (this.buffer.length > MAX_RESPONSE_LENGTH) {
      this.stop(new Error("Browser response is too large"));
      return;
    }

    const newline = this.buffer.indexOf("\n");
    if (newline < 0) return;
    const line = this.buffer.slice(0, newline);
    this.buffer = this.buffer.slice(newline + 1);
    const pending = this.pending;
    if (!pending || this.buffer.length > 0) {
      this.stop(new Error("Invalid browser helper response"));
      return;
    }

    this.pending = undefined;
    clearTimeout(pending.timer);
    try {
      const error = line.startsWith("{") ? (JSON.parse(line) as { error?: unknown }).error : undefined;
      if (typeof error === "string") pending.reject(new Error(error));
      else pending.resolve(line);
    } catch {
      pending.reject(new Error("Invalid browser helper response"));
    }
    this.sendNextRequest();
  }

  private stop(error: Error): void {
    if (this.stopped) return;
    this.stopped = true;
    if (sessions.get(this.key) === this) sessions.delete(this.key);
    process.removeListener("exit", this.onHostExit);
    this.child.kill();
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = undefined;
    }
    for (const request of [...this.focusRequests, ...this.otherRequests]) request.reject(error);
    this.focusRequests.length = 0;
    this.otherRequests.length = 0;
  }
}

export async function runBrowserHelper(name: string, args: string[], signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  const binary = await getNativeExecutable();
  signal?.throwIfAborted();
  const key = JSON.stringify([binary, name, args[1] ?? ""]);
  let session = sessions.get(key);
  if (!session) {
    if (args[0] === "focus" && isRetainedTabId(args[3] ?? "")) {
      throw new Error("Tab list expired. Refresh the list.");
    }
    session = new BrowserHelperSession(binary, key, name);
    sessions.set(key, session);
  }
  return session.request(args, signal);
}
