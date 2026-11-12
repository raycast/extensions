import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { delimiter, dirname, isAbsolute, join } from "node:path";
import { homedir } from "node:os";
import { ScanOptions } from "../types";
import { expandPath } from "./path-validation";

export const INSTALL_HELP =
  "Install Node.js 20.19.0+ and npkill 1.x with npm install -g npkill, then set the executable path if needed.";

export function cliEnvironment(executable?: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NO_COLOR: "1",
    PATH: [
      executable ? dirname(executable) : "",
      process.env.PATH,
      "/opt/homebrew/bin",
      "/usr/local/bin",
      "/usr/bin",
      "/bin",
      join(homedir(), ".volta/bin"),
      join(homedir(), ".local/bin"),
    ]
      .filter(Boolean)
      .join(delimiter),
  };
}

async function findExecutable(name: string, env: NodeJS.ProcessEnv): Promise<string> {
  const candidates = isAbsolute(name)
    ? [name]
    : (env.PATH ?? "")
        .split(delimiter)
        .filter(Boolean)
        .map((dir) => join(dir, name));
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      /* Try the next PATH entry. */
    }
  }
  throw new Error(`Cannot find ${name}. ${INSTALL_HELP}`);
}

export function readVersion(executable: string, env: NodeJS.ProcessEnv, signal: AbortSignal): Promise<string> {
  if (signal.aborted) return Promise.reject(new Error("Version check canceled."));
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ["--version"], {
      env,
      shell: false,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let error = "";
    let failure: Error | undefined;
    const kill = () => {
      if (!child.pid) return;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };
    const abort = () => {
      failure = new Error("Version check canceled.");
      kill();
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    const timeout = setTimeout(() => {
      failure = new Error(`Version check timed out: ${executable}`);
      kill();
    }, 5000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      output = (output + chunk).slice(-8192);
    });
    child.stderr.on("data", (chunk: string) => {
      error = (error + chunk).slice(-8192);
    });
    child.on("error", (err) => {
      failure = err;
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(`${executable}: ${error || `exited with code ${code}`}`));
      else resolve(output.trim());
    });
  });
}

export function validateVersions(node: string, npkill: string): void {
  const n = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(node.trim());
  const k = /^(?:npkill\s+)?v?(\d+)\.(\d+)\.(\d+)$/.exec(npkill.trim());
  if (!n || Number(n[1]) < 20 || (Number(n[1]) === 20 && Number(n[2]) < 19))
    throw new Error(`Unsupported Node.js version: ${node}. ${INSTALL_HELP}`);
  if (!k || Number(k[1]) !== 1)
    throw new Error(`Unsupported npkill version: ${npkill}. Use npkill 1.x (schema version 1).`);
}

export async function detectCli(
  customPath: string,
  signal: AbortSignal,
): Promise<{ executable: string; env: NodeJS.ProcessEnv }> {
  const custom = expandPath(customPath.trim());
  if (custom && !isAbsolute(custom)) throw new Error("The custom npkill executable must be an absolute path.");
  const executable = await findExecutable(custom || "npkill", cliEnvironment(custom));
  const env = cliEnvironment(executable);
  const node = await findExecutable("node", env);
  const nodeVersion = await readVersion(node, env, signal);
  const version = await readVersion(executable, env, signal);
  validateVersions(nodeVersion, version);
  return { executable, env };
}

export function buildArguments(options: ScanOptions): string[] {
  const profiles = options.profiles
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!profiles.length || profiles.some((p) => !/^[a-zA-Z0-9_-]+$/.test(p)))
    throw new Error("Enter comma-separated profile names, for example node,python.");
  const args = ["--directory", options.root, "--profiles", profiles.join(","), "--json-stream", "--dry-run"];
  if (options.config.trim()) {
    const config = expandPath(options.config.trim());
    if (!isAbsolute(config)) throw new Error("The configuration file must be an absolute path.");
    args.push("--config", config);
  }
  if (options.exclusions.trim())
    args.push(
      "--exclude",
      options.exclusions
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .join(","),
    );
  if (options.includeSensitive) args.push("--include-sensitive");
  return args;
}
