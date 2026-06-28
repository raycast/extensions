import { shellEnv } from "shell-env";

export interface ShellEnvType {
  env: Record<string, string>;
  shell: string;
}

let cachedShellEnv: ShellEnvType | null = null;

/**
 * Resolve the user's shell executable from the environment
 */
function resolveShellExecutable(env: Record<string, string>): string {
  return env.SHELL || "/bin/zsh";
}

/**
 * Get the user's shell environment with caching.
 * Uses shell-env to properly load the user's shell configuration.
 */
export async function getShellEnv(): Promise<ShellEnvType> {
  if (cachedShellEnv) {
    return cachedShellEnv;
  }

  const env = await shellEnv();

  cachedShellEnv = {
    env,
    shell: resolveShellExecutable(env),
  };

  return cachedShellEnv;
}

/**
 * Environment variables for consistent command output
 */
export const EXEC_ENV_OVERRIDES = {
  FORCE_COLOR: "0",
  NO_COLOR: "1",
};
