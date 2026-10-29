import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";

import { stripAnsi, Prefs } from "./utils";

// === Types ===

type SshExecErrorLike = {
  message?: string;
  killed?: boolean;
  signal?: string | null;
};

export type RunRemoteOptions = {
  bypassQueue?: boolean;
  retries?: number;
  timeoutMs?: number;
};

// === Queue ===

let remoteQueueTail: Promise<unknown> = Promise.resolve();

// === Helpers ===

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function enqueueRemoteTask<T>(task: () => Promise<T>): Promise<T> {
  const run = remoteQueueTail.then(task, task);
  remoteQueueTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function isRetryableRemoteError(message: string): boolean {
  return /kex_exchange_identification|Connection reset by peer|Connection timed out|Operation timed out|Broken pipe|Connection refused/i.test(
    message,
  );
}

export function formatSshError(host: string, err: unknown, stderr: string): Error {
  const e: SshExecErrorLike = typeof err === "object" && err !== null ? (err as SshExecErrorLike) : {};
  const rawStderr = stripAnsi(String(stderr ?? "")).trim();
  const rawMessage = stripAnsi(String(e.message ?? "")).trim();
  const message = rawStderr || rawMessage || "SSH error";

  if (/Could not resolve hostname/i.test(message)) {
    return new Error(`SSH host "${host}" not found. Check Raycast Preferences -> SSH Connection (try "xkeen").`);
  }

  if (/Connection refused/i.test(message)) {
    return new Error(
      `SSH to "${host}" refused (Connection refused). For xkeen, this usually means Entware/USB (/opt) is down or SSH on port 222 is not running.`,
    );
  }

  if (/Permission denied/i.test(message)) {
    return new Error(`SSH authentication failed for "${host}". Check keys and root access on port 222.`);
  }

  if (/No route to host|Operation not permitted|Operation timed out|timed out/i.test(message)) {
    return new Error(`No network access to "${host}". Check Wi-Fi/LAN, router IP, and port 222 availability.`);
  }

  if (e.killed || e.signal === "SIGTERM") {
    return new Error(
      `SSH command to "${host}" exceeded timeout. Possible hanging xkeen command or Entware/USB (/opt) issue.`,
    );
  }

  return new Error(message);
}

function runRemoteRaw(cmd: string, timeoutMs = 20000): Promise<{ stdout: string; stderr: string }> {
  const prefs = getPreferenceValues<Prefs>();
  const host = (prefs.sshHost || "xkeen").trim();
  const wrapped = `export PATH=/opt/sbin:/opt/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH; export TERM=dumb; ${cmd}`;
  const args = [
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=5",
    "-o",
    "ServerAliveInterval=5",
    "-o",
    "ServerAliveCountMax=1",
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "LogLevel=ERROR",
    host,
    wrapped,
  ];

  return new Promise((resolve, reject) => {
    execFile("ssh", args, { maxBuffer: 10 * 1024 * 1024, timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) return reject(formatSshError(host, err, stderr));
      resolve({
        stdout: stripAnsi(String(stdout ?? "")).trim(),
        stderr: stripAnsi(String(stderr ?? "")).trim(),
      });
    });
  });
}

export function runRemote(cmd: string, options: RunRemoteOptions = {}): Promise<{ stdout: string; stderr: string }> {
  const retries = options.retries ?? 2;
  const timeoutMs = options.timeoutMs ?? 20000;

  const runWithRetry = async () => {
    let attempt = 0;
    while (true) {
      try {
        return await runRemoteRaw(cmd, timeoutMs);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt >= retries || !isRetryableRemoteError(message)) throw error;
        const backoffMs = Math.min(1400, 250 * Math.pow(2, attempt));
        await sleep(backoffMs);
        attempt += 1;
      }
    }
  };

  if (options.bypassQueue) return runWithRetry();
  return enqueueRemoteTask(runWithRetry);
}
