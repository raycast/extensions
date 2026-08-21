import { execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { getApplications, getPreferenceValues } from "@raycast/api";
import { CapdFailed, CapdNotInstalled, CapdResult, ExitCode, explain, isAbort, parseHits } from "./contract";
import type { Hit } from "./types";

const execFileAsync = promisify(execFile);

const BUNDLE_ID = "dev.jxd.capd";
const BUNDLED_BINARY = "Contents/MacOS/capd";
const HOMEBREW_SHIMS = ["/opt/homebrew/bin/capd", "/usr/local/bin/capd"];
const MAX_BUFFER = 64 * 1024 * 1024;

export const DEFAULT_SEARCH_LIMIT = 25;

let resolved: string | undefined;

/**
 * There is only ever one real `capd` binary and it lives inside `capd.app` — the Homebrew
 * cask installs a symlink to that same path. Since a DMG user can drag the app anywhere and
 * the CLI is not on PATH unless they add it themselves, ask LaunchServices for the bundle
 * rather than guessing a location.
 */
export async function resolveCapd(): Promise<string> {
  if (resolved) {
    return resolved;
  }

  for (const candidate of await candidates()) {
    if (await isExecutable(candidate)) {
      resolved = candidate;
      return candidate;
    }
  }
  throw new CapdNotInstalled();
}

async function candidates(): Promise<string[]> {
  const configured = getPreferenceValues<Preferences>().capdPath?.trim();
  const bundles = (await getApplications())
    .filter((application) => application.bundleId === BUNDLE_ID)
    .map((application) => join(application.path, BUNDLED_BINARY));

  return [...(configured ? [configured] : []), ...bundles, ...HOMEBREW_SHIMS];
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the exit code instead of throwing on it, because exit 1 means "no results" — an
 * ordinary outcome callers render as an empty list. Only genuine failures throw.
 */
export async function run(args: string[], signal?: AbortSignal): Promise<CapdResult> {
  const binary = await resolveCapd();

  try {
    const { stdout, stderr } = await execFileAsync(binary, args, {
      signal,
      maxBuffer: MAX_BUFFER,
    });
    return { stdout, stderr, code: ExitCode.ok };
  } catch (error) {
    if (isAbort(error)) {
      throw error;
    }

    const failure = error as {
      code?: number | string;
      stdout?: string;
      stderr?: string;
    };
    if (typeof failure.code !== "number") {
      throw new CapdNotInstalled();
    }

    const result = {
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      code: failure.code,
    };
    if (result.code === ExitCode.noResults) {
      return result;
    }
    throw new CapdFailed(result.code, explain(result));
  }
}

export async function search(query: string, limit: number, signal?: AbortSignal): Promise<Hit[]> {
  const { stdout } = await run(["search", query, "--json", "--limit", String(limit)], signal);
  return parseHits(stdout);
}

/**
 * Returns the CLI's own line — `Captured #3: …` or `Already captured #3 (2026-03-03): …`.
 * `--json` drops the duplicate signal, and re-capturing something already saved is exactly
 * what a person needs to be told about.
 */
export async function add(input: string): Promise<string> {
  const { stdout } = await run(["add", input]);
  return stdout.trim().split("\n")[0] ?? "";
}

export type Removal = { removed: string[]; missing?: string };

export async function remove(ids: number[]): Promise<Removal> {
  const { stdout, stderr, code } = await run(["rm", ...ids.map(String)]);
  return {
    removed: stdout.trim().split("\n").filter(Boolean),
    missing: code === ExitCode.noResults ? stderr.trim() : undefined,
  };
}

export function searchLimit(): number {
  const configured = Number.parseInt(getPreferenceValues<Preferences>().searchLimit ?? "", 10);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_SEARCH_LIMIT;
}
