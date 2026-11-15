import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Cache, getApplications } from "@raycast/api";

const HEX_BUNDLE_ID = "anomaly.hex";
export const HEX_RELEASES_URL = "https://github.com/anomalyco/hex/releases";

const CLI_IN_BUNDLE = "Contents/MacOS/hex";
const cache = new Cache();
const APP_PATH_KEY = "hexAppPath";

export const MEETING_START_TIMEOUT_MS = 15_000;

export class HexError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HexError";
  }
}

async function hexBinary(): Promise<string> {
  const remembered = cache.get(APP_PATH_KEY);
  if (remembered && existsSync(join(remembered, CLI_IN_BUNDLE))) {
    return join(remembered, CLI_IN_BUNDLE);
  }
  const apps = (await getApplications()).filter((candidate) => candidate.bundleId === HEX_BUNDLE_ID);
  if (apps.length === 0) {
    throw new HexError("hex-missing", "Hex isn't installed. Download it from GitHub");
  }
  const app = apps.find((candidate) => existsSync(join(candidate.path, CLI_IN_BUNDLE)));
  if (!app) {
    throw new HexError("cli-missing", "Hex's command-line tool is missing. Update Hex");
  }
  cache.set(APP_PATH_KEY, app.path);
  return join(app.path, CLI_IN_BUNDLE);
}

type ErrorReply = { status: "error"; code: string; message: string };

function commandFailure(stderr: string, exitCode: number | null): HexError {
  return new HexError(
    exitCode === 3 ? "not-running" : "failed",
    stderr.trim().replace(/^hex: /, "") || "Hex command failed. Try again",
  );
}

function isErrorReply(value: unknown): value is ErrorReply {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { status?: unknown }).status === "error" &&
    typeof (value as { code?: unknown }).code === "string"
  );
}

export function parseReply<T>(stdout: string, stderr: string, exitCode: number | null): T {
  const text = stdout.trim();
  if (text) {
    let reply: unknown;
    try {
      reply = JSON.parse(text);
    } catch {
      if (exitCode !== 0) throw commandFailure(stderr, exitCode);
      throw new HexError("transport", stderr.trim() || "Couldn't read Hex's reply. Try again");
    }
    if (isErrorReply(reply)) throw new HexError(reply.code, reply.message);
    if (exitCode === 0) return reply as T;
  }
  throw commandFailure(stderr, exitCode);
}

type RunOptions = {
  timeoutMs?: number;
  json?: boolean;
  input?: string;
};

function run(
  args: string[],
  { timeoutMs = 20_000, json = true, input }: RunOptions,
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return hexBinary().then(
    (binary) =>
      new Promise((resolve, reject) => {
        const child = execFile(
          binary,
          json ? [...args, "--json"] : args,
          { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 },
          (error, stdout, stderr) => {
            if (error?.killed) {
              reject(new HexError("timeout", "Hex didn't respond in time. Try again"));
              return;
            }
            if (error && typeof error.code === "string") {
              reject(new HexError("transport", error.message));
              return;
            }
            const exitCode = error ? (typeof error.code === "number" ? error.code : null) : 0;
            resolve({ stdout, stderr, exitCode });
          },
        );
        // Hex can exit before reading stdin (EPIPE); its exit code and stderr say why.
        child.stdin?.on("error", () => undefined);
        if (input !== undefined) child.stdin?.end(input);
      }),
  );
}

export async function hex<T>(args: string[], options: Omit<RunOptions, "json"> = {}): Promise<T> {
  const { stdout, stderr, exitCode } = await run(args, options);
  return parseReply<T>(stdout, stderr, exitCode);
}

export async function hexText(args: string[], options: Omit<RunOptions, "json"> = {}): Promise<string> {
  const { stdout, stderr, exitCode } = await run(args, {
    ...options,
    json: false,
  });
  if (exitCode !== 0) throw commandFailure(stderr, exitCode);
  return stdout;
}

export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (!(error instanceof HexError)) return message;
  const kept = message
    .split("; ")
    .map((clause) => clause.replace(/ or run `[^`]*`/g, ""))
    .filter((clause) => !clause.includes("`"));
  return kept.length > 0 ? kept.join("; ") : message.replaceAll("`", "");
}

export function errorCode(error: unknown): string | undefined {
  return error instanceof HexError ? error.code : undefined;
}
