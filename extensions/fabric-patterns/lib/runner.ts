// Spawns fabric safely: absolute path, argv array (no shell), stdin always fed
// or closed (fabric blocks on an open, empty stdin; ISC-3). Stdout is batched
// so the UI re-renders about every `flushMs`, and the tail is flushed on close
// or abort so no text is lost.

import { spawn } from "node:child_process";
import type { Input } from "./argv";
import { parseTokens, type Tokens } from "./metadata";
import { type GroupSignaller, groupAlive, signalGroup } from "./proc";
import { redact } from "./redact";

export interface RunResult {
  code: number | null;
  stdout: string;
  /** fabric's stderr, secrets redacted. */
  stderr: string;
  aborted: boolean;
  /** fabric's token counts, read from stderr before redaction (a localized label could be redacted). */
  tokens?: Tokens;
  /** Set when the process could not start (e.g. ENOENT). */
  error?: string;
}

export interface RunHandle {
  done: Promise<RunResult>;
  /**
   * "stopping": it signalled a live run. "over": the run had ended or was already stopping, so
   * nothing was sent. "denied": the group exists but isn't ours to signal (EPERM); it runs on.
   */
  abort(): AbortOutcome;
}

export type AbortOutcome = "stopping" | "over" | "denied";

export interface RunOptions {
  /** Text piped to stdin; undefined means stdin is closed. */
  stdin?: string;
  /** Layered over process.env (fabric needs HOME). */
  env?: NodeJS.ProcessEnv;
  onText?: (text: string) => void;
  /**
   * Called once per complete stderr line, already redacted, without its `\n` (or `\r\n`); an
   * empty line arrives as "". A trailing line with no newline is delivered once when the run
   * ends, before `done` resolves. Not batched by `flushMs`.
   */
  onStderr?: (line: string) => void;
  flushMs?: number;
  /** How long Stop waits after SIGTERM before it SIGKILLs what is left. */
  killGraceMs?: number;
  /** Test seam for the kernel's answer (an EPERM can't be produced on demand). */
  signalGroup?: GroupSignaller;
}

/** Only text input is piped; every other input reaches fabric by flag. */
export function stdinFor(input: Input): string | undefined {
  return input.kind === "text" ? input.text : undefined;
}

/**
 * Splits chunked stderr into lines for `onStderr`. Each line is redacted whole, so a key split
 * across two chunks is still caught. `end` hands over the unterminated tail once, however often
 * it is called (a failed spawn finishes on both `error` and `close`).
 */
export function stderrLines(onLine: (line: string) => void) {
  let partial = "";
  const deliver = (line: string) => onLine(redact(line.endsWith("\r") ? line.slice(0, -1) : line));
  return {
    push(chunk: string) {
      // Only a chunk with a newline is split, so a long unterminated line isn't rescanned per chunk.
      const nl = chunk.lastIndexOf("\n");
      if (nl < 0) return void (partial += chunk);
      const lines = (partial + chunk.slice(0, nl)).split("\n");
      partial = chunk.slice(nl + 1);
      lines.forEach(deliver);
    },
    end() {
      const tail = partial;
      partial = "";
      if (tail) deliver(tail);
    },
  };
}

// fabric prints this on stdout before the answer when a session is new.
const BANNER = "Creating new session: ";

export function runFabric(fabricPath: string, argv: string[], opts: RunOptions = {}): RunHandle {
  if (!fabricPath.startsWith("/")) throw new Error(`fabric path must be absolute: ${fabricPath}`);
  const piped = opts.stdin !== undefined;
  const asked = argv.includes("--show-metadata");
  const child = spawn(fabricPath, argv, {
    stdio: [piped ? "pipe" : "ignore", "pipe", "pipe"],
    env: { ...process.env, ...opts.env },
    // Its own process group, so Stop reaches what fabric starts (yt-dlp for a YouTube link).
    detached: true,
  });
  const grace = opts.killGraceMs ?? 2000;
  /** Signals fabric's process group ("gone" if it never started). */
  const send = opts.signalGroup ?? signalGroup;
  const signal = (sig: NodeJS.Signals) => (child.pid ? send(child.pid, sig) : "gone");
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  let stdout = "";
  let stderr = "";
  let pending = "";
  let head: string | null = ""; // buffered start of stdout until the banner is ruled in or out
  let timer: ReturnType<typeof setTimeout> | undefined;
  let aborted = false;

  const flush = () => {
    timer = undefined;
    if (!pending) return;
    const t = pending;
    pending = "";
    opts.onText?.(t);
  };

  const emit = (t: string) => {
    if (!t) return;
    stdout += t;
    pending += t;
    if (!timer) timer = setTimeout(flush, opts.flushMs ?? 100);
  };

  const settleHead = (final: boolean) => {
    if (head === null) return;
    const nl = head.indexOf("\n");
    if (nl >= 0 && head.startsWith(BANNER)) {
      const rest = head.slice(nl + 1);
      head = null;
      emit(rest);
    } else if (nl >= 0 || final || !BANNER.startsWith(head.slice(0, BANNER.length))) {
      const all = head;
      head = null;
      emit(all);
    }
  };

  child.stdout!.setEncoding("utf8");
  child.stdout!.on("data", (d: string) => {
    if (head !== null) {
      head += d;
      settleHead(false);
    } else emit(d);
  });
  child.stderr!.setEncoding("utf8");
  const errLines = opts.onStderr && stderrLines(opts.onStderr);
  child.stderr!.on("data", (d: string) => {
    stderr += d;
    errLines?.push(d);
  });

  if (piped) {
    child.stdin!.on("error", () => {}); // fabric may exit before reading it all
    child.stdin!.end(opts.stdin);
  }

  const done = new Promise<RunResult>((resolve) => {
    const finish = (code: number | null, error?: string) => {
      settleHead(true);
      if (timer) clearTimeout(timer);
      flush();
      errLines?.end();
      // Every view shows, toasts or copies stderr, so a key fabric echoes is redacted once, here.
      // Only a run that asked for counts gets them, so a stray `[x] 1 2 3` line never reads as tokens.
      const tokens = asked ? parseTokens(stderr) : undefined;
      resolve({ code, stdout, stderr: redact(stderr), aborted, tokens, error });
    };
    child.on("error", (e) => finish(null, String(e)));
    child.on("close", async (code) => {
      closed = true;
      // A stopped run is over only once its whole group is gone; the SIGKILL timer bounds the wait.
      if (aborted) while (child.pid && groupAlive(child.pid)) await new Promise((r) => setTimeout(r, 25));
      clearTimeout(killTimer); // the group is empty, so its id may be reused: never signal it again
      finish(aborted ? null : code);
    });
  });

  return {
    done,
    abort() {
      // Not `exitCode`: fabric can exit while a child it started still holds the pipes open.
      if (aborted || closed) return "over";
      // fabric leads its own group, so this reaches fabric too while it lives. Gone: the group
      // already ended on its own and close is on its way, so this is no Stop.
      const sent = signal("SIGTERM");
      if (sent === "gone") return "over";
      if (sent === "denied") return "denied";
      aborted = true;
      killTimer = setTimeout(() => signal("SIGKILL"), grace);
      return "stopping";
    },
  };
}
