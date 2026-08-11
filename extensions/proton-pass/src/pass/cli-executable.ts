import { homedir } from "node:os";
import { delimiter, posix, win32 } from "node:path";

type Platform = NodeJS.Platform;
type Environment = NodeJS.ProcessEnv;

export function getCliCandidates(
  platform: Platform = process.platform,
  environment: Environment = process.env,
  home = homedir(),
  configuredPath?: string,
) {
  const path = platform === "win32" ? win32 : posix;
  const executable = platform === "win32" ? "pass-cli.exe" : "pass-cli";
  const candidates: string[] = [];

  if (configuredPath?.trim()) candidates.push(configuredPath.trim());

  const pathValue = getEnvironmentValue(environment, "PATH");
  if (pathValue) {
    const pathDelimiter = platform === "win32" ? ";" : delimiter;
    for (const directory of pathValue.split(pathDelimiter).filter(Boolean)) {
      candidates.push(path.join(directory, executable));
    }
  }

  if (platform === "win32") {
    const localAppData = getEnvironmentValue(environment, "LOCALAPPDATA");
    const userProfile = getEnvironmentValue(environment, "USERPROFILE") || home;
    const programDirectories = [
      getEnvironmentValue(environment, "ProgramFiles"),
      getEnvironmentValue(environment, "ProgramW6432"),
      getEnvironmentValue(environment, "ProgramFiles(x86)"),
      "C:\\Program Files",
    ].filter((value): value is string => Boolean(value));

    if (localAppData) candidates.push(path.join(localAppData, "Programs", "ProtonPass", executable));
    candidates.push(path.join(userProfile, ".local", "bin", executable));
    for (const directory of programDirectories) {
      candidates.push(path.join(directory, "ProtonPass", executable));
      candidates.push(path.join(directory, "pass-cli", executable));
    }
  } else {
    candidates.push(
      path.join(home, ".local", "bin", executable),
      "/usr/local/bin/pass-cli",
      "/opt/homebrew/bin/pass-cli",
    );
  }

  candidates.push(executable);
  return [...new Set(candidates)];
}

export async function findRunnableCli(candidates: string[], check: (candidate: string) => Promise<void>) {
  for (const candidate of candidates) {
    try {
      await check(candidate);
      return candidate;
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
    }
  }
  return undefined;
}

function getEnvironmentValue(environment: Environment, name: string) {
  const key = Object.keys(environment).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? environment[key] : undefined;
}

function isNotFoundError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
