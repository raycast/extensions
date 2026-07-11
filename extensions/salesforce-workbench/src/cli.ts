import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { getPreferences } from "./preferences";
import { parseJsonFromOutput } from "./format";
import { SfEnvelope } from "./types";

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_BUFFER = 25 * 1024 * 1024;

export class SalesforceCliError extends Error {
  constructor(
    message: string,
    readonly stderr = "",
    readonly exitCode?: number,
  ) {
    super(message);
    this.name = "SalesforceCliError";
  }
}

export function withJsonArgs(args: string[]): string[] {
  return args.includes("--json") ? args : [...args, "--json"];
}

export function buildCliEnvironment(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    ...base,
    // Raycast runs extensions as Node development processes. Passing these
    // values through makes the packaged Salesforce CLI try to load its own
    // bundled plugins as source/development plugins.
    NODE_ENV: "production",
    NO_COLOR: "1",
    SF_DISABLE_TELEMETRY: "true",
    SF_HIDE_RELEASE_NOTES: "true",
    // Raycast commands must not race an in-place Salesforce CLI update. A
    // partially replaced CLI can emit plugin-loading errors and hide every org
    // until the next invocation, even though the saved authorizations are fine.
    SF_AUTOUPDATE_DISABLE: "true",
    SF_DISABLE_AUTOUPDATE: "true",
  };
  delete environment.NODE_PATH;
  delete environment.NODE_OPTIONS;
  return environment;
}

export async function verifySfBinary(): Promise<string> {
  const path = getPreferences().sfBinaryPath;
  try {
    await access(path, constants.X_OK);
    return path;
  } catch {
    throw new SalesforceCliError(`Salesforce CLI is not executable at ${path}. Update the extension preference.`);
  }
}

export async function runSfRaw(
  args: string[],
  options: { timeoutMs?: number; maxBuffer?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  const executable = await verifySfBinary();
  return new Promise((resolve, reject) => {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxBuffer = options.maxBuffer ?? MAX_BUFFER;
    const child = spawn(executable, args, {
      detached: true,
      env: buildCliEnvironment(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let forceKillTimer: ReturnType<typeof setTimeout> | undefined;

    const clearTimers = () => {
      clearTimeout(timeout);
      if (forceKillTimer) clearTimeout(forceKillTimer);
    };
    const fail = (error: SalesforceCliError) => {
      if (settled) return;
      settled = true;
      clearTimers();
      reject(error);
    };
    const collect = (current: string, chunk: Buffer): string | undefined => {
      if (Buffer.byteLength(current) + chunk.length > maxBuffer) {
        terminateProcessGroup(child.pid, "SIGKILL");
        fail(new SalesforceCliError("Salesforce CLI output exceeded the configured safety limit."));
        return undefined;
      }
      return current + chunk.toString("utf8");
    };

    child.stdout.on("data", (chunk: Buffer) => {
      const next = collect(stdout, chunk);
      if (next !== undefined) stdout = next;
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const next = collect(stderr, chunk);
      if (next !== undefined) stderr = next;
    });
    child.on("error", (error) => {
      terminateProcessGroup(child.pid, "SIGKILL");
      fail(new SalesforceCliError(error.message, stderr));
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimers();
      if (code !== 0) {
        reject(
          new SalesforceCliError(
            extractCliError(stdout, stderr, `Salesforce CLI request exited with ${code}.`),
            stderr,
            code ?? undefined,
          ),
        );
        return;
      }
      resolve({ stdout, stderr });
    });

    const timeout = setTimeout(() => {
      if (settled) return;
      terminateProcessGroup(child.pid, "SIGTERM");
      forceKillTimer = setTimeout(() => {
        terminateProcessGroup(child.pid, "SIGKILL");
        fail(new SalesforceCliError(`Salesforce CLI request timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
      }, 1_000);
    }, timeoutMs);
  });
}

function terminateProcessGroup(pid: number | undefined, signal: NodeJS.Signals): void {
  if (!pid) return;
  try {
    // The detached CLI launcher owns a process group that also contains the
    // Salesforce CLI's bundled Node child. Killing only the launcher leaves
    // the child running indefinitely and makes every later Org Hub load hang.
    process.kill(-pid, signal);
  } catch {
    // The command may have exited between the timeout/error and this cleanup.
  }
}

export async function runSfJson<T>(
  args: string[],
  options: { timeoutMs?: number; maxBuffer?: number } = {},
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { stdout } = await runSfRaw(withJsonArgs(args), options);
      const envelope = parseJsonFromOutput<SfEnvelope<T>>(stdout);
      if (envelope.status !== 0) {
        throw new SalesforceCliError(envelope.message ?? envelope.name ?? "Salesforce CLI request failed.");
      }
      return envelope.result;
    } catch (error) {
      if (attempt === 0 && isRetryableCliStartupError(error)) continue;
      throw error;
    }
  }
  throw new SalesforceCliError("Salesforce CLI request failed after retrying.");
}

export function isRetryableCliStartupError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("error plugin:") &&
    (message.includes("could not find package.json") || message.includes("falling back to compiled source"))
  );
}

export async function runSfRest<T = unknown>(
  targetOrg: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  endpoint: string,
  body?: Record<string, unknown>,
): Promise<T | undefined> {
  const executable = await verifySfBinary();
  const args = buildRestArgs(targetOrg, method, endpoint, body !== undefined);

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { env: buildCliEnvironment(), stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      if (!settled) {
        settled = true;
        reject(new SalesforceCliError("Salesforce REST request timed out."));
      }
    }, DEFAULT_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length < MAX_BUFFER) stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < MAX_BUFFER) stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        reject(new SalesforceCliError(error.message));
      }
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (settled) return;
      settled = true;
      if (code !== 0) {
        reject(
          new SalesforceCliError(
            extractCliError(stdout, stderr, `Salesforce REST request exited with ${code}.`),
            stderr,
            code ?? undefined,
          ),
        );
        return;
      }
      const trimmed = stdout.trim();
      if (!trimmed) {
        resolve(undefined);
        return;
      }
      try {
        resolve(parseJsonFromOutput<T>(trimmed));
      } catch {
        resolve(trimmed as T);
      }
    });

    if (body !== undefined) child.stdin.end(JSON.stringify(body));
    else child.stdin.end();
  });
}

export function buildRestArgs(
  targetOrg: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  endpoint: string,
  hasBody: boolean,
): string[] {
  const args = ["api", "request", "rest", endpoint, "--target-org", targetOrg, "--method", method];
  if (hasBody) args.push("--body", "-");
  else if (method !== "GET") args.push("--body", "{}");
  return args;
}

export async function runSfBrowserCommand(args: string[], timeoutMs = 5 * 60_000): Promise<void> {
  const executable = await verifySfBinary();
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, { env: buildCliEnvironment(), stdio: "ignore" });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new SalesforceCliError("Salesforce browser command timed out."));
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(new SalesforceCliError(error.message));
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new SalesforceCliError(`Salesforce browser command exited with ${code}.`, "", code ?? undefined));
    });
  });
}

function extractCliError(stdout: string, stderr: string, fallback: string): string {
  for (const output of [stdout, stderr]) {
    try {
      const envelope = parseJsonFromOutput<Partial<SfEnvelope<unknown>>>(output);
      if (envelope.message) return envelope.message;
      if (envelope.name) return envelope.name;
    } catch {
      // The CLI can emit ordinary warnings to stderr; fall through to sanitized text.
    }
  }
  const useful = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.includes("update available"))
    .join("\n");
  return useful || fallback;
}
