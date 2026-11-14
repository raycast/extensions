import { spawn } from "node:child_process";
import { Artifact, ScanOptions, ScanRoot } from "../types";
import { buildArguments, detectCli } from "./npkill-cli";
import { captureArtifact, validateRoot } from "./path-validation";
import { LineBuffer, parseRecord, parseStderr } from "./json-stream";

const activeRoots = new Set<string>();

interface ScanCallbacks {
  onRoot: (root: ScanRoot) => void;
  onArtifact: (artifact: Artifact) => void;
  onWarning: (message: string) => void;
}

export async function scan(
  options: ScanOptions,
  signal: AbortSignal,
  callbacks: ScanCallbacks,
): Promise<"complete" | "canceled"> {
  const root = await validateRoot(options.root);
  if (signal.aborted) return "canceled";
  if (activeRoots.has(root.path)) throw new Error("A scan is already running for this directory.");
  activeRoots.add(root.path);
  try {
    const args = buildArguments({ ...options, root: root.path });
    const cli = await detectCli(options.executable, signal);
    if (signal.aborted) return "canceled";
    callbacks.onRoot(root);
    const child = spawn(cli.executable, args, {
      cwd: root.path,
      env: cli.env,
      shell: false,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    let closed = false;
    const killGroup = (kind: NodeJS.Signals) => {
      if (!child.pid || closed) return;
      try {
        process.kill(-child.pid, kind);
      } catch {
        child.kill(kind);
      }
    };
    const stop = () => {
      if (closed || killTimer) return;
      killGroup("SIGTERM");
      killTimer = setTimeout(() => killGroup("SIGKILL"), 1500);
    };
    const completion = new Promise<{ code: number | null; error?: Error }>((resolve) => {
      let spawnError: Error | undefined;
      child.on("error", (error) => {
        spawnError = error;
      });
      child.on("close", (code) => {
        closed = true;
        if (killTimer) clearTimeout(killTimer);
        resolve({ code, error: spawnError });
      });
    });
    signal.addEventListener("abort", stop, { once: true });
    if (signal.aborted) stop();
    const pending: ReturnType<typeof parseRecord>[] = [];
    const stdout = new LineBuffer((line) => pending.push(parseRecord(line)));
    let lastError = "";
    let stderrFailure: Error | undefined;
    const stderr = new LineBuffer((line) => {
      lastError = parseStderr(line);
      callbacks.onWarning(lastError);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      try {
        stderr.write(chunk);
      } catch (error) {
        stderrFailure = error as Error;
        stop();
      }
    });
    child.stdout.setEncoding("utf8");
    const consume = async () => {
      for (const record of pending.splice(0)) {
        if (signal.aborted) break;
        // .npkillrc may enable sensitive results independently of our CLI flag.
        if (record.risk === "sensitive" && !options.includeSensitive) continue;
        try {
          callbacks.onArtifact(await captureArtifact(root, record));
        } catch (error) {
          callbacks.onWarning(`${record.path}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
    try {
      for await (const chunk of child.stdout) {
        if (signal.aborted) break;
        try {
          stdout.write(String(chunk));
        } catch (error) {
          // Keep valid records that preceded a malformed record in the same chunk.
          await consume();
          throw error;
        }
        // Await validation to apply backpressure instead of building an unbounded promise queue.
        await consume();
      }
      if (!signal.aborted) {
        stdout.end();
        await consume();
      }
      const result = await completion;
      if (signal.aborted) return "canceled";
      stderr.end();
      if (stderrFailure) throw stderrFailure;
      if (result.error) throw result.error;
      if (result.code !== 0)
        throw new Error(
          `npkill exited with code ${result.code ?? "signal"}${lastError ? `: ${lastError}` : ". Check your profiles and configuration."}`,
        );
      return "complete";
    } finally {
      stop();
      await completion;
      signal.removeEventListener("abort", stop);
    }
  } finally {
    activeRoots.delete(root.path);
  }
}
