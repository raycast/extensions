import { constants } from "node:fs";
import { access, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { GroundcrewClientError } from "./errors";

const DEFAULT_HOMEBREW_PATHS = ["/opt/homebrew/bin/crew", "/usr/local/bin/crew"] as const;

export interface ResolveCrewExecutableOptions {
  configuredPath?: string;
  environment?: NodeJS.ProcessEnv;
  homeDirectory?: string;
  homebrewPaths?: readonly string[];
}

type ExecutableState = "executable" | "missing" | "not-executable";

async function executableState(candidate: string): Promise<ExecutableState> {
  try {
    const candidateStat = await stat(candidate);
    if (!candidateStat.isFile()) {
      return "not-executable";
    }
    await access(candidate, constants.X_OK);
    return "executable";
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return "missing";
    }
    return "not-executable";
  }
}

function nodeVersionParts(directoryName: string): readonly number[] | undefined {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(directoryName);
  if (match === null) {
    return undefined;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function newestNodeVersionFirst(left: string, right: string): number {
  const leftParts = nodeVersionParts(left);
  const rightParts = nodeVersionParts(right);
  if (leftParts === undefined || rightParts === undefined) {
    return right.localeCompare(left);
  }
  for (let index = 0; index < leftParts.length; index += 1) {
    const difference = (rightParts[index] ?? 0) - (leftParts[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

async function nvmCandidates(nvmDirectory: string): Promise<string[]> {
  const versionsDirectory = path.join(nvmDirectory, "versions", "node");
  try {
    const entries = await readdir(versionsDirectory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort(newestNodeVersionFirst)
      .map((version) => path.join(versionsDirectory, version, "bin", "crew"));
  } catch {
    return [];
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export async function resolveCrewExecutable(options: ResolveCrewExecutableOptions = {}): Promise<string> {
  const configuredPath = options.configuredPath?.trim();
  if (configuredPath !== undefined && configuredPath.length > 0) {
    if (!path.isAbsolute(configuredPath)) {
      throw new GroundcrewClientError(
        "INVALID_EXECUTABLE_PREFERENCE",
        "The Groundcrew executable preference must be an absolute path, such as /opt/homebrew/bin/crew.",
      );
    }
    const state = await executableState(configuredPath);
    if (state === "missing") {
      throw new GroundcrewClientError(
        "EXECUTABLE_NOT_FOUND",
        `The configured Groundcrew executable does not exist: ${configuredPath}`,
      );
    }
    if (state !== "executable") {
      throw new GroundcrewClientError(
        "EXECUTABLE_NOT_EXECUTABLE",
        `The configured Groundcrew path is not an executable file: ${configuredPath}`,
      );
    }
    return configuredPath;
  }

  const environment = options.environment ?? process.env;
  const pathCandidates = (environment.PATH ?? "")
    .split(path.delimiter)
    .filter((entry) => entry.length > 0)
    .map((entry) => path.resolve(entry, "crew"));
  const homebrewCandidates = options.homebrewPaths ?? DEFAULT_HOMEBREW_PATHS;
  const homeDirectory = options.homeDirectory ?? homedir();
  const nvmDirectory = environment.NVM_DIR ?? path.join(homeDirectory, ".nvm");
  const candidates = unique([...pathCandidates, ...homebrewCandidates, ...(await nvmCandidates(nvmDirectory))]);
  const nonExecutable: string[] = [];

  for (const candidate of candidates) {
    const state = await executableState(candidate);
    if (state === "executable") {
      return candidate;
    }
    if (state === "not-executable") {
      nonExecutable.push(candidate);
    }
  }

  if (nonExecutable.length > 0) {
    throw new GroundcrewClientError(
      "EXECUTABLE_NOT_EXECUTABLE",
      `Found Groundcrew candidate paths that are not executable files: ${nonExecutable.join(", ")}`,
    );
  }
  throw new GroundcrewClientError(
    "EXECUTABLE_NOT_FOUND",
    "Could not find an executable named crew on Raycast's PATH, in common Homebrew locations, or in installed nvm Node-version bins. Set the absolute Groundcrew Executable Path preference.",
  );
}
