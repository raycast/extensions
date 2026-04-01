import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import type { PeonPingResolvedPaths } from "./peon-ping-paths";

export type PeonPingCommandTarget = {
  source: "cli" | "script";
  command: string;
  executablePath: string;
  argsPrefix: readonly string[];
};

export type PeonPingCommandPaths = PeonPingResolvedPaths & {
  commandTarget?: PeonPingCommandTarget;
};

type ResolvePeonPingCommandTargetInput = {
  pathEnv?: string | null;
  hasExecutable?: (candidate: string) => boolean;
};

const COMMON_PEON_PATHS = [
  "/opt/homebrew/bin/peon",
  "/usr/local/bin/peon",
  "/home/linuxbrew/.linuxbrew/bin/peon",
] as const;

function splitPathEntries(pathEnv: string | null | undefined): string[] {
  if (!pathEnv) {
    return [];
  }

  return pathEnv
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function findPeonExecutable(
  pathEnv: string | null | undefined,
  hasExecutable: (candidate: string) => boolean,
): string | null {
  for (const entry of splitPathEntries(pathEnv)) {
    const candidate = join(entry, "peon");
    if (hasExecutable(candidate)) {
      return candidate;
    }
  }

  for (const candidate of COMMON_PEON_PATHS) {
    if (hasExecutable(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function resolvePeonPingCommandTarget(
  paths: PeonPingResolvedPaths,
  input: ResolvePeonPingCommandTargetInput = {},
): PeonPingCommandTarget {
  const hasExecutable = input.hasExecutable ?? existsSync;
  const cliPath = findPeonExecutable(
    input.pathEnv ?? process.env.PATH,
    hasExecutable,
  );

  if (cliPath) {
    return {
      source: "cli",
      command: cliPath,
      executablePath: cliPath,
      argsPrefix: [],
    };
  }

  return {
    source: "script",
    command: "bash",
    executablePath: paths.scriptPath,
    argsPrefix: [paths.scriptPath],
  };
}

export function withPeonPingCommandTarget(
  paths: PeonPingResolvedPaths,
  input: ResolvePeonPingCommandTargetInput = {},
): PeonPingCommandPaths {
  return {
    ...paths,
    commandTarget: resolvePeonPingCommandTarget(paths, input),
  };
}
