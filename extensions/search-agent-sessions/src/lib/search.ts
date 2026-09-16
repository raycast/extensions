import { spawn, type ChildProcessByStdio } from "node:child_process";
import { existsSync } from "node:fs";
import type { Readable, Writable } from "node:stream";
import { IS_WINDOWS, RG_BIN, SPAWN_ENV, corpusPath } from "./paths";
import { hasManagedRg, managedRgPath } from "./ripgrep";

/**
 * stderr is dropped: ripgrep runs with --no-messages, and failures are detected
 * from the exit code instead (0 matched, 1 matched nothing, >=2 real failure).
 */
type RgProcess = ChildProcessByStdio<Writable, Readable, null>;

/**
 * Budget for the partial-match pass. Truncating it drops the END OF THE FILE,
 * and which sessions that costs depends on how the corpus was last written: a
 * full rebuild writes files in mtime-descending order, so the tail holds the
 * OLDEST sessions, while later incremental appends land the newest sessions
 * there. So this is a runaway guard for a corpus far larger than today's, not a
 * routine limit: the worst common-word query measured here streams the whole
 * corpus in ~0.4s on ripgrep and ~0.6s on grep, and pass 1 (the top of the
 * ranking) has already completed. The grep figure is the one to watch — it is
 * the backend with no floor beneath it, and it reaches this budget on a corpus
 * roughly forty times smaller than ripgrep would need.
 * Whenever it does fire, {@link SearchCallbacks.onTruncated} reports it.
 */
const PARTIAL_BUDGET_MS = 2000;

const RG_BASE = [
  "--no-config",
  "--no-messages",
  "--color=never",
  "-F",
  "-i",
  "-N",
  // Without this a single stray NUL makes rg abandon the whole corpus and print
  // one "binary file matches" line, which reads downstream as zero results.
  "--text",
];

/**
 * The same request, spelled for the grep every macOS ships. `-a` is `--text`,
 * `-s` is `--no-messages`, and neither line numbers nor a config file are
 * things BSD grep volunteers, so `-N` and `--no-config` have no counterpart.
 *
 * Exit codes agree with ripgrep's — 0 matched, 1 matched nothing, 2 and up a
 * real failure — which is what lets one process-handling path serve both.
 */
const GREP_BASE = ["--color=never", "-F", "-i", "-a", "-s"];

export type BackendKind = "ripgrep" | "grep";

export interface Backend {
  kind: BackendKind;
  bin: string;
  base: string[];
}

/**
 * Which binary sweeps the corpus, given what is available.
 *
 * The order is fastest-first with a floor rather than a preference list: the
 * copy this extension installed is a known version at a known path, a ripgrep
 * already on the machine is next, and system grep is the floor that makes the
 * whole thing work with nothing installed at all. It is roughly forty times
 * slower on a corpus this size, which the partial pass's budget absorbs by
 * truncating rather than by hanging.
 *
 * Pure, and taking its inputs as arguments, so every arm is reachable from the
 * unit suite on a machine that has ripgrep installed.
 */
export function chooseBackend(found: {
  managed: string | null;
  onPath: string | null;
}): Backend {
  const rg = found.managed ?? found.onPath;
  if (rg) return { kind: "ripgrep", bin: rg, base: RG_BASE };
  return { kind: "grep", bin: "/usr/bin/grep", base: GREP_BASE };
}

/**
 * Resolved per search rather than once at load, so an install that finishes
 * while the command is open is picked up by the next keystroke without a
 * reload.
 *
 * `RG_BIN` falls back to the bare name when it probes nothing, which would spawn
 * against PATH and fail as ENOENT — so on Windows, where there is no grep floor
 * to fall to, that bare name is still the right answer; on macOS it is only
 * taken when a probe actually found something.
 */
export function activeBackend(): Backend {
  const onPath = IS_WINDOWS || RG_BIN !== "rg" ? RG_BIN : null;
  return chooseBackend({
    managed: !IS_WINDOWS && hasManagedRg() ? managedRgPath() : null,
    onPath,
  });
}

/**
 * A spawn failure that names nothing useful, rewritten to name the thing that
 * is missing. Reachable on Windows, which has no grep to fall back to, and on a
 * macOS somehow missing /usr/bin/grep. Every other spawn failure is passed
 * through untouched.
 */
export function rgError(
  err: NodeJS.ErrnoException,
  windows = IS_WINDOWS,
): Error {
  const install = windows
    ? "winget install BurntSushi.ripgrep.MSVC"
    : "brew install ripgrep";
  return err.code === "ENOENT"
    ? new Error(
        `ripgrep is not installed. Install it with \`${install}\`, then reopen this command.`,
      )
    : err;
}

/** The two passes of {@link search}, in the order they complete. */
export type SearchPass = "all" | "partial";

export interface SearchCallbacks {
  /** Called with a batch of raw corpus lines (`key \t seq \t text`). */
  onLines(lines: string[]): void;
  /** Fires once per pass, after that pass's last lines. */
  onPassDone(pass: SearchPass): void;
  /**
   * The partial pass gave up at its budget, short of the corpus end, so results
   * are incomplete. Only that pass is budgeted, so this fires at most once.
   */
  onTruncated?(): void;
  onDone(): void;
  onError(error: Error): void;
}

export interface SearchHandle {
  cancel(): void;
}

/**
 * Splits a stdout stream into lines, delivering them in chunk-sized batches.
 * `stop` ends the stream when a batch returns false, and records that the
 * teardown was deliberate so the exit code is not read as a failure.
 */
function pump(
  proc: RgProcess,
  onBatch: (lines: string[]) => boolean,
  stop: (proc: RgProcess) => void,
) {
  let rest = "";
  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (chunk: string) => {
    const combined = rest + chunk;
    const cut = combined.lastIndexOf("\n");
    if (cut === -1) {
      rest = combined;
      return;
    }
    rest = combined.slice(cut + 1);
    const lines = combined.slice(0, cut).split("\n");
    if (!onBatch(lines)) stop(proc);
  });
  proc.stdout.on("end", () => {
    if (rest) onBatch([rest]);
    rest = "";
  });
}

/**
 * Two streaming passes over the derived corpus.
 *
 * Pass 1 chains one `rg` per word, so it emits exactly the lines containing
 * every word — the top of the ranking, delivered first and in full. Pass 2 then
 * sweeps for any single word to surface partial matches below them. Both are
 * consumed incrementally; nothing waits for a process to exit.
 *
 * Pass 2 necessarily re-emits every pass 1 line: excluding them means matching
 * "not (word1 and ... and wordN)", which no chain of rg filters can express.
 * Re-scoring them is harmless — a session keeps its best line either way.
 */
export function search(
  words: string[],
  callbacks: SearchCallbacks,
): SearchHandle {
  const procs: RgProcess[] = [];
  /** Streams torn down on purpose; their non-zero exit is not a failure. */
  const stopped = new Set<RgProcess>();
  let cancelled = false;
  let failed = false;

  // Nothing to grep for, and pass 1 would index words[0] blind.
  if (words.length === 0) {
    callbacks.onDone();
    return { cancel() {} };
  }

  const corpus = corpusPath();
  if (!existsSync(corpus)) {
    callbacks.onError(new Error(`Search index not found at ${corpus}`));
    callbacks.onDone();
    return { cancel() {} };
  }

  const backend = activeBackend();

  const stop = (proc: RgProcess) => {
    stopped.add(proc);
    proc.stdout.destroy();
  };

  const kill = () => {
    for (const p of procs) {
      stop(p);
      try {
        p.kill("SIGKILL");
      } catch {
        // Already exited.
      }
    }
    procs.length = 0;
  };

  const spawnRg = (args: string[]) => {
    const proc = spawn(backend.bin, args, {
      stdio: ["pipe", "pipe", "ignore"],
      env: SPAWN_ENV,
    });
    // A killed upstream stage makes downstream writes fail; that is expected.
    proc.stdin.on("error", () => undefined);
    proc.on("error", (err) => {
      if (!cancelled) callbacks.onError(rgError(err));
    });
    proc.on("close", (code) => {
      // 1 means "no matches", a normal result, as does a stream we tore down
      // ourselves; only 2 and up (unreadable corpus, bad arguments) are faults.
      if (cancelled || stopped.has(proc) || code === null || code < 2) return;
      failed = true;
      callbacks.onError(new Error(`${backend.kind} failed (exit ${code})`));
    });
    procs.push(proc);
    return proc;
  };

  let stage = spawnRg([...backend.base, "-e", words[0], "--", corpus]);
  for (let i = 1; i < words.length; i++) {
    const next = spawnRg([...backend.base, "-e", words[i]]);
    stage.stdout.pipe(next.stdin);
    stage = next;
  }

  const startPartial = () => {
    if (cancelled) return;
    // After a pass 1 failure the same corpus read would only fail again.
    if (failed || words.length < 2) {
      callbacks.onDone();
      return;
    }
    const deadline = Date.now() + PARTIAL_BUDGET_MS;
    const args = [...backend.base];
    for (const word of words) args.push("-e", word);
    args.push("--", corpus);
    const proc = spawnRg(args);
    pump(
      proc,
      (lines) => {
        if (cancelled) return false;
        callbacks.onLines(lines);
        if (Date.now() < deadline) return true;
        callbacks.onTruncated?.();
        return false;
      },
      stop,
    );
    proc.on("close", () => {
      if (cancelled) return;
      callbacks.onPassDone("partial");
      callbacks.onDone();
    });
  };

  pump(
    stage,
    (lines) => {
      if (cancelled) return false;
      callbacks.onLines(lines);
      return true;
    },
    stop,
  );
  stage.on("close", () => {
    if (cancelled) return;
    callbacks.onPassDone("all");
    startPartial();
  });

  return {
    cancel() {
      cancelled = true;
      kill();
    },
  };
}
