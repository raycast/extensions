/**
 * Agent Process Environment
 *
 * Raycast runs extensions with a nearly empty environment: no `USER`, no `LOGNAME`,
 * and a `PATH` that contains only whatever the user typed into "Additional PATH
 * Directories". Passing that straight to an agent breaks anything it shells out to —
 * on macOS the Claude CLI reads its credentials via `/usr/bin/security -a $USER`, so
 * without those two it reports "not logged in" and rejects prompts with
 * `-32000 Authentication required`, even though the user is signed in.
 *
 * Everything that spawns an agent goes through here so the agent starts with a usable
 * baseline: the inherited environment first, then the user's own additions, then
 * standard system locations as a fallback.
 */

import { userInfo, homedir } from "os";
import type { AgentConfig } from "@/types/extension";

export type AgentEnvironmentConfig = Pick<AgentConfig, "environmentVariables" | "appendToPath">;

const POSIX_SYSTEM_PATHS = ["/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"];

/** Homebrew's prefix on Apple Silicon, where user-installed CLIs usually live. */
const APPLE_SILICON_PATHS = ["/opt/homebrew/bin"];

function pathSeparator(): string {
  return process.platform === "win32" ? ";" : ":";
}

function systemPathDefaults(): string[] {
  if (process.platform === "win32") {
    const systemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT ?? "C:\\Windows";
    return [`${systemRoot}\\system32`, systemRoot, `${systemRoot}\\system32\\Wbem`];
  }

  return process.arch === "arm64" ? [...POSIX_SYSTEM_PATHS, ...APPLE_SILICON_PATHS] : POSIX_SYSTEM_PATHS;
}

/**
 * Build the PATH for an agent process.
 *
 * Order is deliberate: whatever was inherited stays in front, the user's additions
 * follow, and the system defaults come last so they can never shadow a deliberate
 * choice — they only fill in what Raycast left out.
 */
export function buildAgentPath(inheritedPath: string, appendToPath?: string[]): string {
  const separator = pathSeparator();
  const segments: string[] = [];

  const add = (candidates: string[]) => {
    for (const candidate of candidates) {
      const segment = candidate?.trim();
      if (segment && !segments.includes(segment)) {
        segments.push(segment);
      }
    }
  };

  add(inheritedPath ? inheritedPath.split(separator) : []);
  add(appendToPath ?? []);
  add(systemPathDefaults());

  return segments.join(separator);
}

/**
 * Build the full environment for a spawned agent process.
 */
export function buildAgentEnvironment(config: AgentEnvironmentConfig): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...(config.environmentVariables ?? {}) };

  const inheritedPath = env.PATH ?? env.Path ?? env.path ?? "";
  const resolvedPath = buildAgentPath(inheritedPath, config.appendToPath);
  env.PATH = resolvedPath;
  env.Path = resolvedPath;
  env.path = resolvedPath;

  // `os.userInfo()` reads the passwd database rather than the environment, so it
  // still resolves when Raycast passes neither USER nor LOGNAME.
  let username: string | undefined;
  try {
    username = userInfo().username;
  } catch {
    username = undefined;
  }

  if (process.platform === "win32") {
    if (!env.USERNAME && username) {
      env.USERNAME = username;
    }
  } else {
    if (!env.USER && username) {
      env.USER = username;
    }
    if (!env.LOGNAME && username) {
      env.LOGNAME = username;
    }
  }

  if (!env.HOME) {
    env.HOME = homedir();
  }

  return env;
}
