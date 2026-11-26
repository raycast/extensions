import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PackageManagerInfo, PackageManagerName } from "../types";
import { expandTilde } from "./format";
import { compareSemver } from "./semver";

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export interface ExecOptions {
  cwd?: string;
  timeoutMs?: number;
  additionalPath?: string;
  env?: Record<string, string>;
}

function getNvmBinPaths(home: string): string[] {
  const nvmVersionsDir = path.join(home, ".nvm", "versions", "node");
  try {
    const entries = fs
      .readdirSync(nvmVersionsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort((a, b) => compareSemver(b, a));
    return entries.map((ver) => path.join(nvmVersionsDir, ver, "bin"));
  } catch {
    return [];
  }
}

function getFnmBinPaths(home: string): string[] {
  const candidates = [
    path.join(home, ".local", "share", "fnm", "aliases", "default", "bin"),
    path.join(home, "Library", "Application Support", "fnm", "aliases", "default", "bin"),
    path.join(home, ".fnm", "current", "bin"),
  ];
  return candidates.filter((dir) => fs.existsSync(dir));
}

export function buildEnhancedPath(additionalPath?: string): string {
  const home = os.homedir();
  const extraEntries = additionalPath
    ? additionalPath
        .split(":")
        .map((p) => expandTilde(p))
        .filter(Boolean)
    : [];

  const standardCandidates = [
    ...extraEntries,
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    "/usr/local/bin",
    "/usr/local/sbin",
    path.join(home, ".volta", "bin"),
    path.join(home, ".bun", "bin"),
    path.join(home, ".local", "share", "mise", "shims"),
    path.join(home, ".asdf", "shims"),
    path.join(home, ".nodenv", "shims"),
    ...getFnmBinPaths(home),
    ...getNvmBinPaths(home),
    path.join(home, "Library", "pnpm"),
    path.join(home, ".local", "share", "pnpm"),
    path.join(home, ".pnpm-global", "bin"),
    path.join(home, ".yarn", "bin"),
    path.join(home, ".npm-global", "bin"),
    path.join(home, ".local", "bin"),
    ...(process.env.PATH ? process.env.PATH.split(":") : []),
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const dir of standardCandidates) {
    if (!dir || seen.has(dir)) continue;
    seen.add(dir);
    deduped.push(dir);
  }
  return deduped.join(":");
}

export function findBinary(binaryName: string, additionalPath?: string): string | undefined {
  const pathDirs = buildEnhancedPath(additionalPath).split(":");
  for (const dir of pathDirs) {
    if (!dir) continue;
    const candidate = path.join(dir, binaryName);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      const stat = fs.statSync(candidate);
      if (stat.isFile()) {
        return candidate;
      }
    } catch {
      // keep searching
    }
  }
  return undefined;
}

export function execCommand(binary: string, args: string[], options: ExecOptions = {}): Promise<ExecResult> {
  const startTime = Date.now();
  const resolvedBin = path.isAbsolute(binary) ? binary : (findBinary(binary, options.additionalPath) ?? binary);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: buildEnhancedPath(options.additionalPath),
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    npm_config_update_notifier: "false",
    ...options.env,
  };

  return new Promise((resolve) => {
    execFile(
      resolvedBin,
      args,
      {
        cwd: options.cwd,
        env,
        timeout: options.timeoutMs ?? 120_000,
        maxBuffer: 15 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        const out = typeof stdout === "string" ? stdout : String(stdout ?? "");
        const err = typeof stderr === "string" ? stderr : String(stderr ?? "");

        if (!error) {
          resolve({ exitCode: 0, stdout: out, stderr: err, durationMs, timedOut: false });
          return;
        }

        const errObj = error as NodeJS.ErrnoException & { code?: number | string; killed?: boolean; signal?: string };
        const timedOut = Boolean(errObj.killed && errObj.signal === "SIGTERM");
        const exitCode = typeof errObj.code === "number" ? errObj.code : 1;
        const combinedStderr =
          err.trim() ||
          (errObj.code === "ENOENT"
            ? `Command "${binary}" was not found in PATH. Install it or configure Additional PATH Entries in Packdeck preferences.`
            : error.message);

        resolve({
          exitCode,
          stdout: out,
          stderr: combinedStderr,
          durationMs,
          timedOut,
        });
      },
    );
  });
}

const ALL_MANAGERS: PackageManagerName[] = ["npm", "pnpm", "yarn", "bun"];

export async function detectInstalledPackageManagers(additionalPath?: string): Promise<PackageManagerInfo[]> {
  return Promise.all(
    ALL_MANAGERS.map(async (name): Promise<PackageManagerInfo> => {
      const binaryPath = findBinary(name, additionalPath);
      if (!binaryPath) {
        return { name, installed: false };
      }
      const res = await execCommand(binaryPath, ["--version"], { timeoutMs: 8000, additionalPath });
      const version = res.exitCode === 0 ? res.stdout.trim().split(/\r?\n/)[0]?.replace(/^v/, "") : undefined;
      return {
        name,
        installed: res.exitCode === 0,
        version,
        binaryPath,
      };
    }),
  );
}
