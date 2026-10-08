import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { FmError, stripAnsi, toFmError } from "./errors";

/** Tests point this at a stub script; the extension always uses the fm tool that ships with macOS 27. */
export const FM_PATH = process.env.AFM_FM_PATH || "/usr/bin/fm";

/** The model sees 8,192 tokens. Keep prompts well below that so the answer still fits. */
export const CONTEXT_WINDOW = 8192;
export const MAX_PROMPT_TOKENS = 5000;

const DEFAULT_TIMEOUT_MS = 180_000;
const KILL_GRACE_MS = 2000;
const UPDATE_INTERVAL_MS = 60;

export type Guardrails = "default" | "permissive-content-transformations";
export type BuiltInTool = "ocr" | "barcode";

export interface RespondOptions {
  prompt: string;
  /** Not allowed together with `transcriptPath`, because a transcript already has its instructions. */
  instructions?: string;
  /** A transcript file to continue from (`--resume`). */
  transcriptPath?: string;
  images?: string[];
  tools?: BuiltInTool[];
  guardrails?: Guardrails;
}

export interface RunOptions {
  signal?: AbortSignal;
  /** Called with the whole answer so far, at most every 60 ms while the answer streams in. */
  onText?: (text: string) => void;
  timeoutMs?: number;
}

export function isFmInstalled(): boolean {
  return existsSync(FM_PATH);
}

/** NUL bytes cannot be passed to a process and the model does not need them. */
export function cleanText(text: string): string {
  return text.replaceAll("\0", "");
}

/**
 * Builds the `fm respond` arguments. The prompt is sent on stdin, which keeps long text off the command line
 * (where it hits the size limit and shows in `ps`). `fm` ignores stdin when an image is attached, so with
 * images the prompt is the last argument, after `--` so a prompt that starts with "-" is not read as an option.
 */
export function buildRespondArgs(options: RespondOptions): { args: string[]; input?: string } {
  const args = ["respond", "--stream"];
  if (options.transcriptPath) {
    args.push(`--resume=${options.transcriptPath}`);
  } else if (options.instructions?.trim()) {
    // The `=` form keeps instructions that start with "-" (for example a Markdown list) from being read as options.
    args.push(`--instructions=${cleanText(options.instructions.trim())}`);
  }
  for (const image of options.images ?? []) {
    args.push(`--image=${image}`);
  }
  for (const tool of options.tools ?? []) {
    args.push(`--tool=${tool}`);
  }
  if (options.guardrails && options.guardrails !== "default") {
    args.push(`--guardrails=${options.guardrails}`);
  }
  const prompt = cleanText(options.prompt);
  if (options.images?.length) {
    args.push("--", prompt);
    return { args };
  }
  return { args, input: prompt };
}

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * Runs `fm` once and waits for it to exit. stdin carries `input` (or nothing) and is then closed, because
 * `fm` waits on an open stdin. The process is stopped when the signal aborts or the timeout passes (SIGTERM, then
 * SIGKILL if it does not exit), so it never outlives the command that started it.
 */
export function runFm(
  args: string[],
  { signal, onText, timeoutMs = DEFAULT_TIMEOUT_MS, input }: RunOptions & { input?: string } = {},
) {
  return new Promise<RunResult>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new FmError("cancelled", "Stopped."));
      return;
    }
    if (!isFmInstalled()) {
      reject(new FmError("not-installed", "The fm command line tool was not found. It comes with macOS 27."));
      return;
    }

    const child = spawn(FM_PATH, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let lastUpdate = 0;
    let stopReason: FmError | undefined;
    let killTimer: NodeJS.Timeout | undefined;

    const stop = (reason: FmError) => {
      if (stopReason) return;
      stopReason = reason;
      child.kill("SIGTERM");
      killTimer = setTimeout(() => child.kill("SIGKILL"), KILL_GRACE_MS);
    };
    const onAbort = () => stop(new FmError("cancelled", "Stopped."));
    const timer = setTimeout(
      () => stop(new FmError("timeout", "The model took too long to answer, so the request was stopped.")),
      timeoutMs,
    );
    signal?.addEventListener("abort", onAbort, { once: true });

    // A process that exits early closes stdin; that is reported by "close", so ignore the write error.
    child.stdin.on("error", () => undefined);
    child.stdin.end(input ?? "");
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      const now = Date.now();
      if (onText && now - lastUpdate >= UPDATE_INTERVAL_MS) {
        lastUpdate = now;
        onText(stripAnsi(stdout));
      }
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    const cleanUp = () => {
      clearTimeout(timer);
      clearTimeout(killTimer);
      signal?.removeEventListener("abort", onAbort);
    };
    child.on("error", (error) => {
      cleanUp();
      reject(new FmError("unknown", `Could not start fm: ${error.message}`));
    });
    child.on("close", (exitCode) => {
      cleanUp();
      if (stopReason) {
        reject(stopReason);
        return;
      }
      resolve({ stdout: stripAnsi(stdout), stderr, exitCode });
    });
  });
}

/** Sends one prompt to the on-device model and returns the full answer. */
export async function respond(options: RespondOptions, runOptions: RunOptions = {}): Promise<string> {
  const { args, input } = buildRespondArgs(options);
  const { stdout, stderr, exitCode } = await runFm(args, { ...runOptions, input });
  if (exitCode !== 0) {
    throw toFmError(stderr, exitCode);
  }
  const answer = stdout.trim();
  runOptions.onText?.(answer);
  return answer;
}

export function parseTokenCount(output: string): number {
  const count = Number.parseInt(stripAnsi(output).trim(), 10);
  if (Number.isNaN(count)) {
    throw new FmError("unknown", `Could not read the token count from fm: ${output.trim()}`);
  }
  return count;
}

async function runCountTokens(args: string[], input: string | undefined, signal?: AbortSignal): Promise<number> {
  const { stdout, stderr, exitCode } = await runFm(["count-tokens", "--quiet", ...args], {
    timeoutMs: 30_000,
    input,
    signal,
  });
  if (exitCode !== 0) {
    throw toFmError(stderr, exitCode);
  }
  return parseTokenCount(stdout);
}

/** Counts the tokens of a text (sent on stdin), optionally together with instructions. */
export function countTokens(
  text: string,
  { instructions, signal }: { instructions?: string; signal?: AbortSignal } = {},
): Promise<number> {
  const args = instructions?.trim() ? [`--instructions=${cleanText(instructions.trim())}`] : [];
  return runCountTokens(args, cleanText(text), signal);
}

/**
 * Counts the tokens of a whole transcript file. A chat puts its new message in the transcript as the last
 * entry, so the message is never on the command line: count-tokens ignores stdin when given a transcript.
 */
export function countTranscriptTokens(transcriptPath: string, { signal }: { signal?: AbortSignal } = {}) {
  return runCountTokens([`--transcript=${transcriptPath}`], undefined, signal);
}

export type ModelStatus = { available: true } | { available: false; message: string };

export async function getModelStatus(): Promise<ModelStatus> {
  const { stdout, stderr, exitCode } = await runFm(["available"], { timeoutMs: 30_000 });
  const message = stripAnsi(`${stdout}\n${stderr}`).trim();
  if (exitCode === 0 && /available/i.test(message) && !/unavailable|not available/i.test(message)) {
    return { available: true };
  }
  return { available: false, message: message || `fm available exited with code ${exitCode}` };
}

export type LicenseStatus = { accepted: true; message: string } | { accepted: false; message: string };

export async function getLicenseStatus(): Promise<LicenseStatus> {
  const { stdout, stderr, exitCode } = await runFm(["license", "--status"], { timeoutMs: 30_000 });
  const message = stripAnsi(`${stdout}\n${stderr}`).trim();
  if (exitCode === 0 && /agreed to license/i.test(message)) {
    return { accepted: true, message };
  }
  return { accepted: false, message: message || `fm license --status exited with code ${exitCode}` };
}
