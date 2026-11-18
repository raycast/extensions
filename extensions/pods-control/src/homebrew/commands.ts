import { execFile } from "child_process";
import { accessSync, closeSync, constants, statSync } from "fs";
import { BREW_SEARCH_PATHS, CLI_BREW_FORMULA, HOMEBREW_URL } from "./constants";
import { acquireBrewLock, brewLockSupervisorCommand, openBrewLock } from "./lock";
import { runProcessWithLifetime } from "./process-lifetime";

// The tap builds from source. Include time for downloads and compilation.
const BREW_INSTALL_TIMEOUT_MS = 10 * 60 * 1000;
const BREW_PATH_ENV = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");

export function findBrewPath(): string | null {
  for (const candidate of BREW_SEARCH_PATHS) {
    try {
      accessSync(candidate, constants.X_OK);
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Try the next installation prefix.
    }
  }
  return null;
}

export async function findBrewCliPrefix(brewPath: string): Promise<string | null> {
  const installed = await runBrewCommand(brewPath, ["list", "--formula", "--full-name"]);
  if (!installed.split(/\s+/).includes(CLI_BREW_FORMULA)) return null;
  return (await runBrewCommand(brewPath, ["--prefix", CLI_BREW_FORMULA])).trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function brewFormula(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || !Array.isArray(value.formulae)) return null;
  const formulae = value.formulae.filter(isRecord);
  return (
    formulae.find((candidate) => candidate.full_name === CLI_BREW_FORMULA) ??
    (formulae.length === 1 ? formulae[0] : null)
  );
}

function brewStableVersion(value: unknown): string | null {
  const formula = brewFormula(value);
  if (!formula || !isRecord(formula.versions) || typeof formula.versions.stable !== "string") return null;
  const stable = formula.versions.stable.trim();
  return stable || null;
}

function brewLinkedKeg(value: unknown): boolean | null {
  const formula = brewFormula(value);
  if (!formula || !("linked_keg" in formula)) return null;
  const linked = formula.linked_keg;
  if (linked === null) return false;
  if (typeof linked !== "string") return null;
  return linked.trim().length > 0;
}

/**
 * Report whether Homebrew has the formula linked into its prefix.
 * Null means Homebrew could not answer; callers keep their filesystem evidence.
 */
export async function findBrewLinkedKeg(brewPath: string): Promise<boolean | null> {
  try {
    const stdout = await runBrewCommand(brewPath, ["info", "--json=v2", CLI_BREW_FORMULA]);
    const parsed: unknown = JSON.parse(stdout);
    return brewLinkedKeg(parsed);
  } catch {
    return null;
  }
}

/**
 * Return the local tap's current stable version without running `brew update`.
 * The tap can be stale until the user updates Homebrew in Terminal.
 */
export async function findBrewLatestVersion(brewPath: string): Promise<string | null> {
  try {
    const stdout = await runBrewCommand(brewPath, ["info", "--json=v2", CLI_BREW_FORMULA]);
    const parsed: unknown = JSON.parse(stdout);
    return brewStableVersion(parsed);
  } catch {
    return null;
  }
}

export async function installCliWithBrew(): Promise<void> {
  await runBrewCommand(requireBrew(), ["install", CLI_BREW_FORMULA], BREW_INSTALL_TIMEOUT_MS, true);
}

export async function updateCliWithBrew(): Promise<void> {
  await runBrewCommand(requireBrew(), ["upgrade", CLI_BREW_FORMULA], BREW_INSTALL_TIMEOUT_MS, true);
}

function requireBrew(): string {
  const path = findBrewPath();
  if (!path)
    throw new Error(`Homebrew was not found. Install it from ${HOMEBREW_URL}, then choose the Refresh action.`);
  return path;
}

function runBrewCommand(brewPath: string, args: string[], timeout = 15000, exclusive = false): Promise<string> {
  if (exclusive) return runExclusiveBrewCommand(brewPath, args, timeout);
  return runBrewQuery(brewPath, args, timeout);
}

async function runExclusiveBrewCommand(brewPath: string, args: string[], timeout: number): Promise<string> {
  const lockFileDescriptor = openBrewLock();
  try {
    try {
      await acquireBrewLock(lockFileDescriptor);
    } catch (error) {
      // 75 is lockf's EX_TEMPFAIL: another process holds the lock.
      if ((error as { code?: number | string }).code === 75) {
        throw new Error(
          "A CLI installation or update is already running. Wait for it to finish, then choose the Refresh action.",
        );
      }
      throw error;
    }
    const command = brewLockSupervisorCommand(brewPath, args);
    const result = await runProcessWithLifetime(command.file, command.args, {
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, PATH: BREW_PATH_ENV },
      lockFileDescriptor,
    });
    if (result.timedOut) {
      throw new Error(`Homebrew ${args[0]} timed out. Check Homebrew in Terminal, then choose the Refresh action.`);
    }
    if (result.outputLimitExceeded) {
      throw new Error(
        `Homebrew ${args[0]} produced too much output. Check Homebrew in Terminal, then choose the Refresh action.`,
      );
    }
    if (result.exitCode === 0) return result.stdout;
    const failure = result.stderr.trim();
    if (failure) throw new Error(failure);
    throw new Error(
      result.signal ? `Homebrew ${args[0]} terminated by ${result.signal}.` : `Homebrew ${args[0]} failed.`,
    );
  } finally {
    closeSync(lockFileDescriptor);
  }
}

function runBrewQuery(brewPath: string, args: string[], timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      brewPath,
      args,
      { timeout, maxBuffer: 10 * 1024 * 1024, encoding: "utf8", env: { ...process.env, PATH: BREW_PATH_ENV } },
      (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout);
        } else if (error.killed) {
          reject(
            new Error(`Homebrew ${args[0]} timed out. Check Homebrew in Terminal, then choose the Refresh action.`),
          );
        } else {
          // Keep Homebrew's recovery instructions, which often span several lines.
          reject(new Error(stderr.trim() || error.message));
        }
      },
    );
  });
}
