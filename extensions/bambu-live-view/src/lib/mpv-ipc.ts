import { ChildProcess } from "node:child_process";
import net from "node:net";

/**
 * Minimal client for mpv's JSON IPC protocol (--input-ipc-server).
 * https://mpv.io/manual/stable/#json-ipc
 */

type IpcMessage = {
  event?: string;
  request_id?: number;
  error?: string;
  data?: unknown;
  level?: string;
  text?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function connect(socketPath: string): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(socketPath);
    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
  });
}

/** Sends one command and resolves with its `data`, or undefined if mpv is unreachable or returns an error. */
export async function ipcRequest(socketPath: string, command: unknown[], timeoutMs = 1000): Promise<unknown> {
  let socket: net.Socket;
  try {
    socket = await connect(socketPath);
  } catch {
    return undefined;
  }
  return new Promise((resolve) => {
    let buffer = "";
    const done = (value: unknown) => {
      clearTimeout(timer);
      socket.destroy();
      resolve(value);
    };
    const timer = setTimeout(() => done(undefined), timeoutMs);
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        try {
          const message = JSON.parse(line) as IpcMessage;
          if (message.request_id === 1) done(message.error === "success" ? message.data : undefined);
        } catch {
          // Ignore malformed lines.
        }
      }
    });
    socket.on("error", () => done(undefined));
    socket.on("close", () => done(undefined));
    socket.write(JSON.stringify({ command, request_id: 1 }) + "\n");
  });
}

export type StartupFailure = "auth" | "exited" | "timeout";

export class StartupError extends Error {
  readonly reason: StartupFailure;

  constructor(reason: StartupFailure) {
    super(reason);
    this.reason = reason;
  }
}

/**
 * Waits until mpv has actually opened the stream (its `file-loaded` event), rather than just until the
 * process exists. Rejects with a StartupError if mpv exits, reports an error, or takes too long.
 *
 * Log lines from mpv are only pattern-matched, never surfaced, because they can contain the stream URL.
 */
export function waitForPlayback(child: ChildProcess, socketPath: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let socket: net.Socket | undefined;
    let authFailed = false;

    const finish = (error?: StartupError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off("exit", onExit);
      socket?.destroy();
      if (error) reject(error);
      else resolve();
    };
    const onExit = () => finish(new StartupError(authFailed ? "auth" : "exited"));
    const timer = setTimeout(() => finish(new StartupError("timeout")), timeoutMs);
    child.once("exit", onExit);

    const handle = (message: IpcMessage) => {
      if (message.event === "log-message" && /\b401\b|Unauthorized/i.test(message.text ?? "")) {
        authFailed = true;
      } else if (message.event === "file-loaded") {
        finish();
      } else if (message.event === "end-file" && (message as { reason?: string }).reason === "error") {
        finish(new StartupError(authFailed ? "auth" : "exited"));
      } else if (message.request_id === 1 && message.error === "success" && message.data) {
        // The stream was already open by the time we connected.
        finish();
      }
    };

    (async () => {
      // The socket appears shortly after mpv starts; retry until then.
      while (!settled && !socket) {
        try {
          socket = await connect(socketPath);
        } catch {
          await sleep(100);
        }
      }
      if (settled || !socket) return;

      let buffer = "";
      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          try {
            handle(JSON.parse(line) as IpcMessage);
          } catch {
            // Ignore malformed lines.
          }
        }
      });
      socket.on("error", () => undefined); // mpv exiting closes the socket; the exit handler reports it.
      socket.write(JSON.stringify({ command: ["request_log_messages", "error"] }) + "\n");
      socket.write(JSON.stringify({ command: ["get_property", "file-format"], request_id: 1 }) + "\n");
    })();
  });
}
