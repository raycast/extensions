import { configPath } from "./config";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

export type CliFailure =
  "missing" | "network" | "timeout" | "login-required" | "configuration" | "unsupported" | "failed";
export class CliError extends Error {
  constructor(public readonly kind: CliFailure) {
    super(cliErrorMessage(kind));
  }
}
export function cliErrorMessage(kind: CliFailure): string {
  switch (kind) {
    case "missing":
      return "AWS CLI was not found. Install AWS CLI v2 or set AWS CLI Path in preferences.";
    case "network":
      return "AWS connection failed. Automatic checks will retry less frequently.";
    case "timeout":
      return "AWS CLI timed out. Check your connection and try again.";
    case "login-required":
      return "Sign in with AWS IAM Identity Center to obtain credentials.";
    case "configuration":
      return "AWS CLI could not use this profile. Check your IAM Identity Center configuration.";
    case "unsupported":
      return "Install a current AWS CLI v2 with configure export-credentials support.";
    case "failed":
      return "AWS CLI could not complete the request. Check your connection, SSO permissions, and CLI configuration.";
  }
}

export function classifyCliError(stderr: string): CliFailure {
  if (
    /error loading sso token|token.*does not exist|sso session.*(?:expired|invalid)|token has expired|token.*expired.*refresh failed|unauthorizedexception.*(?:token|session).*(?:expired|invalid)|invalidgrantexception/i.test(
      stderr,
    )
  )
    return "login-required";
  if (
    /could not connect to the endpoint|connection (?:was )?(?:closed|reset|refused)|connect timeout|read timeout|ssl validation failed|name or service not known|failed to establish a new connection/i.test(
      stderr,
    )
  )
    return "network";
  if (/config profile.*not.*found|unable to parse config|missing.*sso|invalid.*sso.*configuration/i.test(stderr))
    return "configuration";
  if (/invalid choice.*export-credentials|invalid choice.*valid choices/i.test(stderr)) return "unsupported";
  return "failed";
}

export async function findAwsCli(custom?: string, env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
  const candidates = custom?.trim()
    ? [custom.trim()]
    : [
        ...(env.PATH || "")
          .split(":")
          .filter(isAbsolute)
          .map((path) => join(path, "aws")),
        "/opt/homebrew/bin/aws",
        "/usr/local/bin/aws",
        "/usr/local/aws-cli/v2/current/bin/aws",
        "/usr/local/aws-cli/aws",
      ];
  for (const candidate of new Set(candidates)) {
    if (!isAbsolute(candidate)) continue;
    try {
      await access(candidate, constants.X_OK);
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      /* Try the next installation path. */
    }
  }
  return undefined;
}

export function cliEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_SESSION_TOKEN",
    "AWS_SECURITY_TOKEN",
    "AWS_ROLE_ARN",
    "AWS_WEB_IDENTITY_TOKEN_FILE",
    "AWS_ROLE_SESSION_NAME",
  ])
    delete env[key];
  // Only direct SSO profiles are supported. Prevent static credentials from shadowing SSO.
  return {
    ...env,
    AWS_CONFIG_FILE: configPath(),
    AWS_SHARED_CREDENTIALS_FILE: "/dev/null",
    AWS_PAGER: "",
    AWS_CLI_AUTO_PROMPT: "off",
    AWS_EC2_METADATA_DISABLED: "true",
  };
}

export interface RunOptions {
  timeoutMs?: number;
  discardOutput?: boolean;
  env?: NodeJS.ProcessEnv;
}
/** Never rejects with a child-process Error: it can contain credentials in stdout/stderr. */
export function runAws(executable: string, args: string[], options: RunOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let size = 0;
    let settled = false;
    const child = spawn(executable, args, {
      shell: false,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: options.env || cliEnvironment(),
    });
    const kill = () => {
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };
    const finish = (failure?: CliFailure) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const output = stdout;
      stdout = "";
      stderr = "";
      if (failure) reject(new CliError(failure));
      else resolve(output);
    };
    const timer = setTimeout(() => {
      kill();
      finish("timeout");
    }, options.timeoutMs ?? 8000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        kill();
        finish("failed");
      } else if (!options.discardOutput && !settled) stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      if (!settled && stderr.length < 65536) stderr += chunk.slice(0, 65536 - stderr.length);
    });
    child.on("error", (error: NodeJS.ErrnoException) => finish(error.code === "ENOENT" ? "missing" : "failed"));
    child.on("close", (code) => finish(code === 0 ? undefined : classifyCliError(stderr)));
  });
}

export async function requireAwsCli(custom?: string): Promise<string> {
  const path = await findAwsCli(custom);
  if (!path) throw new CliError("missing");
  const version = await runAws(path, ["--version"], { timeoutMs: 3000 });
  if (!/^aws-cli\/2\./.test(version)) throw new CliError("unsupported");
  return path;
}
