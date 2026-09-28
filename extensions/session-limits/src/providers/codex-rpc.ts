import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, isAbsolute, join } from "node:path";
import { record } from "./parsing";

export async function findCodexExecutable(): Promise<string | undefined> {
  const candidates = [
    ...(process.env.PATH ?? "")
      .split(delimiter)
      .filter(isAbsolute)
      .map((directory) => join(directory, "codex")),
    join(homedir(), ".local/bin/codex"),
    join(homedir(), ".npm-global/bin/codex"),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    "/Applications/Codex.app/Contents/Resources/codex",
  ];
  for (const executable of new Set(candidates)) {
    try {
      await access(executable, constants.X_OK);
      if ((await stat(executable)).isFile()) return executable;
    } catch {
      // An absent installation is normal; try the next standard location.
    }
  }
  return undefined;
}

/** Read quota only. Never starts a thread, model turn, or login flow. */
export function readCodexRateLimits(executable: string, home: string, timeoutMs = 15_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ["app-server"], {
      cwd: homedir(),
      env: { ...process.env, CODEX_HOME: home },
      stdio: ["pipe", "pipe", "ignore"],
      detached: process.platform !== "win32",
    });
    let settled = false;
    let pending = "";
    let received = 0;
    let initialized = false;
    const stop = () => {
      child.stdin.destroy();
      child.stdout.destroy();
      // The process group is unique to this one-shot reader, including any children.
      try {
        if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch {
        // The process may already have exited.
      }
    };
    const finish = (error?: Error, data?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stop();
      if (error) reject(error);
      else resolve(data);
    };
    const unavailable = () =>
      new Error(
        "Codex could not read your limits. Open Codex and check that you are signed in with a ChatGPT account, then refresh.",
      );
    const timer = setTimeout(
      () => finish(new Error("Codex took too long to respond. Open Codex, then try refreshing.")),
      timeoutMs,
    );
    const send = (message: unknown) => {
      if (!settled) child.stdin.write(`${JSON.stringify(message)}\n`);
    };
    child.on("error", () => finish(unavailable()));
    child.on("close", () => finish(unavailable()));
    child.stdin.on("error", () => finish(unavailable()));
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      received += Buffer.byteLength(chunk);
      if (received > 1_048_576)
        return finish(new Error("Codex returned an unexpected response. Update Codex and try again."));
      pending += chunk;
      let newline: number;
      while (!settled && (newline = pending.indexOf("\n")) !== -1) {
        const line = pending.slice(0, newline);
        pending = pending.slice(newline + 1);
        if (!line.trim()) continue;
        let message: Record<string, unknown>;
        try {
          message = record(JSON.parse(line));
        } catch {
          return finish(new Error("Codex returned an unexpected response. Update Codex and try again."));
        }
        if (message.id !== 1 && message.id !== 2) continue;
        if (message.error) return finish(unavailable());
        if (!("result" in message)) continue;
        if (message.id === 1 && !initialized) {
          initialized = true;
          send({ method: "initialized", params: {} });
          send({ id: 2, method: "account/rateLimits/read" });
        } else if (message.id === 2 && initialized) finish(undefined, message.result);
      }
    });
    send({
      id: 1,
      method: "initialize",
      params: { clientInfo: { name: "raycast_session_limits", title: "Session Limits", version: "1.1.0" } },
    });
  });
}
