import { execFile, spawn } from "node:child_process";
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

function cliEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NO_COLOR: "1",
    SF_DISABLE_TELEMETRY: "true",
    SF_HIDE_RELEASE_NOTES: "true",
  };
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
    execFile(
      executable,
      args,
      {
        encoding: "utf8",
        env: cliEnvironment(),
        timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxBuffer: options.maxBuffer ?? MAX_BUFFER,
      },
      (error, stdout, stderr) => {
        if (error) {
          const message = extractCliError(stdout, stderr, error.message);
          reject(new SalesforceCliError(message, stderr, typeof error.code === "number" ? error.code : undefined));
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
}

export async function runSfJson<T>(
  args: string[],
  options: { timeoutMs?: number; maxBuffer?: number } = {},
): Promise<T> {
  const { stdout } = await runSfRaw(withJsonArgs(args), options);
  const envelope = parseJsonFromOutput<SfEnvelope<T>>(stdout);
  if (envelope.status !== 0) {
    throw new SalesforceCliError(envelope.message ?? envelope.name ?? "Salesforce CLI request failed.");
  }
  return envelope.result;
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
    const child = spawn(executable, args, { env: cliEnvironment(), stdio: ["pipe", "pipe", "pipe"] });
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
    const child = spawn(executable, args, { env: cliEnvironment(), stdio: "ignore" });
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
