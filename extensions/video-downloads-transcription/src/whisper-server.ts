import { ChildProcess, execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  accessSync,
  constants,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:net";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { cleanWhisperText, WhisperSetup } from "./whisper";

const host = "127.0.0.1";

const guardianSource = String.raw`
const { spawn } = require("node:child_process");
const { rmSync } = require("node:fs");

const binary = process.argv[1];
const args = process.argv.slice(2);
const publicIndex = args.indexOf("--public");
const publicFolder = publicIndex >= 0 ? args[publicIndex + 1] : undefined;
let server;
let stopping;
let shuttingDown = false;

function send(message) {
  if (process.connected) {
    try { process.send(message); } catch {}
  }
}

function stopServer() {
  if (stopping) return stopping;
  stopping = new Promise((resolve) => {
    if (!server || server.exitCode !== null || server.signalCode !== null) {
      resolve();
      return;
    }
    let second;
    let force;
    const done = () => {
      if (second) clearTimeout(second);
      if (force) clearTimeout(force);
      resolve();
    };
    server.once("close", done);
    server.kill("SIGTERM");
    second = setTimeout(() => server.kill("SIGTERM"), 750);
    force = setTimeout(() => server.kill("SIGKILL"), 1750);
  });
  return stopping;
}

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  await stopServer();
  if (process.connected) process.disconnect();
  process.exit(code);
}

process.once("disconnect", () => void shutdown());
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"])
  process.once(signal, () => void shutdown());
process.once("uncaughtException", (error) => {
  send({ type: "error", message: error.message });
  void shutdown(1);
});
process.once("unhandledRejection", (error) => {
  send({ type: "error", message: String(error) });
  void shutdown(1);
});
process.once("exit", () => {
  if (server && server.exitCode === null && server.signalCode === null)
    server.kill("SIGKILL");
  if (publicFolder) rmSync(publicFolder, { recursive: true, force: true });
});

server = spawn(binary, args, {
  shell: false,
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.pipe(process.stdout);
server.stderr.pipe(process.stderr);
server.once("spawn", () => send({ type: "started", pid: server.pid }));
server.once("error", (error) => {
  send({ type: "error", message: error.message });
  void shutdown(1);
});
server.once("close", (code, signal) => {
  send({ type: "exited", code, signal });
  if (!shuttingDown) void shutdown(code === 0 ? 0 : 1);
});
`;

export type WhisperServerSession = {
  ready: Promise<void>;
  transcribe: (
    path: string,
    language: string,
    vadSpeechPadMs?: number,
  ) => Promise<string>;
  close: () => Promise<void>;
};

type WhisperServerOptions = {
  startupTimeoutMs?: number;
  requestTimeoutMs?: number;
  pollIntervalMs?: number;
};

type GuardianResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
  error?: Error;
};

/** The server shipped beside a whisper-cli executable. */
export function whisperServerPath(whisper: string): string {
  return join(dirname(whisper), "whisper-server");
}

/** Arguments that keep the local server private and match whisper-cli's decoding defaults. */
export function whisperServerArguments(
  setup: WhisperSetup,
  port: number,
  requestPath: string,
  language: string,
  vadSpeechPadMs: number,
  publicFolder?: string,
): string[] {
  return [
    "--host",
    host,
    "--port",
    String(port),
    "--request-path",
    requestPath,
    "--inference-path",
    "/inference",
    "--model",
    setup.model,
    "--language",
    language,
    "--best-of",
    "5",
    "--beam-size",
    "5",
    "--no-timestamps",
    "--no-language-probabilities",
    ...(publicFolder ? ["--public", publicFolder] : []),
    ...(setup.vad
      ? [
          "--vad",
          "--vad-model",
          setup.vad,
          "--vad-speech-pad-ms",
          String(vadSpeechPadMs),
        ]
      : []),
  ];
}

function canceledError(): Error {
  const error = new Error("Canceled");
  error.name = "AbortError";
  return error;
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(canceledError());
      return;
    }
    const timer = setTimeout(done, milliseconds);
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(canceledError());
    };
    function done() {
      signal?.removeEventListener("abort", abort);
      resolve();
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

async function availablePort(signal: AbortSignal): Promise<number> {
  if (signal.aborted) throw canceledError();
  const listener = createServer();
  return new Promise<number>((resolve, reject) => {
    const abort = () => listener.close(() => reject(canceledError()));
    signal.addEventListener("abort", abort, { once: true });
    listener.once("error", reject);
    listener.listen(0, host, () => {
      const address = listener.address();
      const port = typeof address === "object" && address ? address.port : 0;
      listener.close((error) => {
        signal.removeEventListener("abort", abort);
        if (error) reject(error);
        else if (!port) reject(new Error("Could not reserve a local port."));
        else resolve(port);
      });
    });
  });
}

type TimedResponse = {
  body: string;
  ok: boolean;
  status: number;
};

async function fetchTextWithTimeout(
  url: string,
  init: RequestInit,
  parent: AbortSignal,
  timeoutMs: number,
): Promise<TimedResponse> {
  const controller = new AbortController();
  const abort = () => controller.abort(parent.reason);
  if (parent.aborted) abort();
  else parent.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new Error("The local whisper server timed out.")),
    timeoutMs,
  );
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.text();
    return { body, ok: response.ok, status: response.status };
  } finally {
    clearTimeout(timer);
    parent.removeEventListener("abort", abort);
  }
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isOwnedServer(
  pid: number,
  binary: string,
  requestPath: string,
): boolean {
  if (!processExists(pid)) return false;
  try {
    const command = execFileSync(
      "/bin/ps",
      ["-p", String(pid), "-o", "command="],
      { encoding: "utf8", timeout: 1_000 },
    );
    return command.includes(binary) && command.includes(requestPath);
  } catch {
    return false;
  }
}

function nodeBinary(): string {
  if (/^node(\.exe)?$/i.test(basename(process.execPath)))
    return process.execPath;
  const runtime = join(
    homedir(),
    "Library/Application Support/com.raycast.macos/NodeJS/runtime",
  );
  try {
    for (const version of readdirSync(runtime).sort().reverse()) {
      const node = join(runtime, version, "bin", "node");
      if (existsSync(node)) return node;
    }
  } catch {
    /* Raycast's standalone runtime is not installed */
  }
  return (
    ["/opt/homebrew/bin/node", "/usr/local/bin/node"].find(existsSync) ?? "node"
  );
}

function waitForExit(
  exit: Promise<GuardianResult>,
  milliseconds: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, milliseconds);
    void exit.then(() => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(true);
    });
  });
}

function inferenceTimeout(path: string, maximum: number): Promise<number> {
  return stat(path)
    .then((info) => {
      const approximateDuration = Math.max(0, info.size - 44) / 32;
      return Math.min(
        maximum,
        Math.max(60_000, approximateDuration * 2 + 30_000),
      );
    })
    .catch(() => Math.min(maximum, 60_000));
}

async function stopGuardian(
  guardian: ChildProcess,
  exit: Promise<GuardianResult>,
): Promise<void> {
  try {
    if (guardian.connected) guardian.disconnect();
    else guardian.kill("SIGTERM");
  } catch {
    guardian.kill("SIGTERM");
  }
  if (await waitForExit(exit, 3_000)) return;
  guardian.kill("SIGTERM");
  if (await waitForExit(exit, 1_000)) return;
  guardian.kill("SIGKILL");
  await waitForExit(exit, 1_000);
}

/** Runs whisper-cli behind the same parent-death guardian used by the warm server. */
export async function runGuardedWhisper(
  bin: string,
  args: string[],
  onProgress?: (line: string) => void,
  signal?: AbortSignal,
  env?: NodeJS.ProcessEnv,
): Promise<string> {
  if (signal?.aborted) throw canceledError();
  const environment = { ...(env ?? process.env) };
  delete environment.NODE_OPTIONS;
  const guardian = spawn(nodeBinary(), ["-e", guardianSource, bin, ...args], {
    shell: false,
    windowsHide: true,
    env: environment,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  let stdout = "";
  let stderr = "";
  const lines = (onLine: (line: string) => void) => {
    let partial = "";
    return (chunk: string) => {
      const parts = (partial + chunk).split(/[\r\n]+/);
      partial = parts.pop() ?? "";
      parts.filter(Boolean).forEach(onLine);
    };
  };
  const progressOut = onProgress && lines(onProgress);
  const progressErr = onProgress && lines(onProgress);
  guardian.stdout?.setEncoding("utf8");
  guardian.stderr?.setEncoding("utf8");
  guardian.stdout?.on("data", (chunk: string) => {
    stdout += chunk;
    if (stdout.length > 20_000_000) guardian.kill("SIGTERM");
    progressOut?.(chunk);
  });
  guardian.stderr?.on("data", (chunk: string) => {
    stderr = (stderr + chunk).slice(-12_000);
    progressErr?.(chunk);
  });
  let childCode: number | null | undefined;
  let childSignal: NodeJS.Signals | null | undefined;
  let childError: string | undefined;
  guardian.on("message", (message: unknown) => {
    if (!message || typeof message !== "object" || !("type" in message)) return;
    if (message.type === "exited") {
      if ("code" in message && typeof message.code === "number")
        childCode = message.code;
      if (
        "signal" in message &&
        (typeof message.signal === "string" || message.signal === null)
      )
        childSignal = message.signal as NodeJS.Signals | null;
    } else if (
      message.type === "error" &&
      "message" in message &&
      typeof message.message === "string"
    )
      childError = message.message;
  });
  let resolveExit: (result: GuardianResult) => void;
  const exit = new Promise<GuardianResult>((resolve) => {
    resolveExit = resolve;
  });
  let result: GuardianResult | undefined;
  guardian.once("error", (error) => {
    result = { code: null, signal: null, error };
    resolveExit(result);
  });
  guardian.once("exit", (code, exitSignal) => {
    if (result) return;
    result = { code, signal: exitSignal };
    resolveExit(result);
  });
  const inputIndex = args.indexOf("-f");
  const timeoutMs = await inferenceTimeout(
    inputIndex >= 0 ? args[inputIndex + 1] : "",
    600_000,
  );
  let timedOut = false;
  let rejectStopped: (error: Error) => void;
  const stopped = new Promise<never>((_, reject) => {
    rejectStopped = reject;
  });
  const abort = () => rejectStopped(canceledError());
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    rejectStopped(new Error("whisper-cli took too long to finish."));
  }, timeoutMs);
  try {
    const completed = await Promise.race([exit, stopped]);
    if (completed.code === 0) return stdout;
    throw new Error(
      `${basename(bin)} failed${childCode === undefined || childCode === null ? "" : ` (${childCode})`}${childSignal ? ` (${childSignal})` : ""}: ${(childError ?? stderr.trim()) || "No details available"}`,
    );
  } catch (error) {
    await stopGuardian(guardian, exit);
    if (timedOut) throw new Error("whisper-cli took too long to finish.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

/**
 * Starts one warmed whisper-server for one dictation. Its guardian owns the
 * server and also shuts it down when the Raycast command disappears abruptly.
 */
export function startWhisperServer(
  setup: WhisperSetup,
  language: string,
  vadSpeechPadMs = 250,
  options: WhisperServerOptions = {},
): WhisperServerSession | undefined {
  const binary = whisperServerPath(setup.whisper);
  try {
    accessSync(binary, constants.X_OK);
  } catch {
    return undefined;
  }

  const lifecycle = new AbortController();
  const requestPath = `/raycast-dictation-${randomBytes(24).toString("hex")}`;
  const publicFolder = mkdtempSync(join(tmpdir(), "raycast-whisper-server-"));
  const startupTimeoutMs = options.startupTimeoutMs ?? 60_000;
  const requestTimeoutMs = options.requestTimeoutMs ?? 300_000;
  const pollIntervalMs = options.pollIntervalMs ?? 75;
  let guardian: ChildProcess | undefined;
  let guardianResult: GuardianResult | undefined;
  let serverPid: number | undefined;
  let stderr = "";
  let port = 0;
  let closePromise: Promise<void> | undefined;
  let resolveGuardianExit: (result: GuardianResult) => void;
  const guardianExit = new Promise<GuardianResult>((resolve) => {
    resolveGuardianExit = resolve;
  });

  const launch = async () => {
    port = await availablePort(lifecycle.signal);
    if (lifecycle.signal.aborted) throw canceledError();
    const environment = { ...process.env };
    delete environment.NODE_OPTIONS;
    guardian = spawn(
      nodeBinary(),
      [
        "-e",
        guardianSource,
        binary,
        ...whisperServerArguments(
          setup,
          port,
          requestPath,
          language,
          vadSpeechPadMs,
          publicFolder,
        ),
      ],
      {
        shell: false,
        windowsHide: true,
        env: environment,
        stdio: ["ignore", "ignore", "pipe", "ipc"],
      },
    );
    guardian.stderr?.setEncoding("utf8");
    guardian.stderr?.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-16_000);
    });
    guardian.on("message", (message: unknown) => {
      if (
        message &&
        typeof message === "object" &&
        "type" in message &&
        message.type === "started" &&
        "pid" in message &&
        typeof message.pid === "number"
      )
        serverPid = message.pid;
    });
    guardian.once("error", (error) => {
      guardianResult = { code: null, signal: null, error };
      resolveGuardianExit(guardianResult);
    });
    guardian.once("exit", (code, signal) => {
      if (guardianResult) return;
      guardianResult = { code, signal };
      resolveGuardianExit(guardianResult);
    });
  };

  const ready = (async () => {
    await launch();
    const deadline = Date.now() + startupTimeoutMs;
    const health = `http://${host}:${port}${requestPath}/health`;
    while (!lifecycle.signal.aborted && Date.now() < deadline) {
      if (guardianResult) {
        const details = stderr.trim();
        throw new Error(
          `The local whisper server stopped while loading${details ? `: ${details}` : "."}`,
        );
      }
      try {
        const response = await fetchTextWithTimeout(
          health,
          { method: "GET" },
          lifecycle.signal,
          750,
        );
        if (response.ok) {
          const status = JSON.parse(response.body) as { status?: unknown };
          if (status.status === "ok") return;
        }
      } catch {
        if (lifecycle.signal.aborted) throw canceledError();
      }
      await delay(pollIntervalMs, lifecycle.signal);
    }
    if (lifecycle.signal.aborted) throw canceledError();
    throw new Error("The local whisper server took too long to load.");
  })();

  const close = (): Promise<void> => {
    if (closePromise) return closePromise;
    closePromise = (async () => {
      try {
        lifecycle.abort();
        if (!guardian) {
          await ready.catch(() => undefined);
          if (!guardian) return;
        }
        try {
          if (guardian.connected) guardian.disconnect();
        } catch {
          guardian.kill("SIGTERM");
        }
        if (await waitForExit(guardianExit, 3_000)) return;
        if (serverPid && isOwnedServer(serverPid, binary, requestPath)) {
          try {
            process.kill(serverPid, "SIGKILL");
          } catch {
            /* the guardian may have finished stopping it */
          }
        }
        guardian.kill("SIGTERM");
        if (await waitForExit(guardianExit, 1_000)) return;
        guardian.kill("SIGKILL");
        await waitForExit(guardianExit, 1_000);
      } finally {
        rmSync(publicFolder, { recursive: true, force: true });
      }
    })();
    return closePromise;
  };
  void ready.catch(() => {
    void close().catch(() => undefined);
  });

  return {
    ready,
    async transcribe(path, requestedLanguage, requestedSpeechPadMs = 250) {
      await ready;
      if (lifecycle.signal.aborted) throw canceledError();
      const audio = await readFile(path);
      const form = new FormData();
      form.append(
        "file",
        new Blob([new Uint8Array(audio)], { type: "audio/wav" }),
        basename(path),
      );
      form.append("language", requestedLanguage);
      form.append("response_format", "json");
      form.append("translate", "false");
      form.append("best_of", "5");
      form.append("beam_size", "5");
      form.append("vad", setup.vad ? "true" : "false");
      form.append("vad_speech_pad_ms", String(requestedSpeechPadMs));
      const response = await fetchTextWithTimeout(
        `http://${host}:${port}${requestPath}/inference`,
        { method: "POST", body: form },
        lifecycle.signal,
        await inferenceTimeout(path, requestTimeoutMs),
      );
      let result: { text?: unknown; error?: unknown };
      try {
        result = JSON.parse(response.body) as {
          text?: unknown;
          error?: unknown;
        };
      } catch {
        throw new Error(
          `The local whisper server returned an invalid response${response.ok ? "." : ` (${response.status}).`}`,
        );
      }
      if (!response.ok || typeof result.error === "string")
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : `The local whisper server failed (${response.status}).`,
        );
      const text = cleanWhisperText(
        typeof result.text === "string" ? result.text : "",
      );
      if (!text)
        throw new Error(
          setup.vad
            ? "No speech was found. The recording may be only music or silence."
            : "No speech was found.",
        );
      return text;
    },
    close,
  };
}
