import { spawn } from "node:child_process";

import { Cache } from "@raycast/api";

import { captureShellEnv, defaultShell } from "./shellEnv";

const ENV_KEY = "shell-env";

const cache = new Cache({ namespace: "spellbook-env" });

let memoryEnv: NodeJS.ProcessEnv | undefined;

export async function getShellEnv(): Promise<NodeJS.ProcessEnv> {
  if (memoryEnv) {
    return memoryEnv;
  }
  const stored = cache.get(ENV_KEY);
  if (stored !== undefined) {
    try {
      memoryEnv = JSON.parse(stored) as NodeJS.ProcessEnv;
      return memoryEnv;
    } catch {
      cache.remove(ENV_KEY);
    }
  }
  const env = await captureShellEnv();
  memoryEnv = env;
  cache.set(ENV_KEY, JSON.stringify(env));
  return env;
}

export function refreshShellEnv(): void {
  memoryEnv = undefined;
  cache.remove(ENV_KEY);
}

export function spawnInline(
  command: string,
  env: NodeJS.ProcessEnv,
  cwd: string,
) {
  // detached puts the shell in its own process group so killInline reaches pipeline children, not just the wrapper shell
  return spawn(defaultShell(), ["-c", command], { env, cwd, detached: true });
}

export function killInline(
  child: ReturnType<typeof spawnInline> | undefined,
): void {
  if (child?.pid === undefined) {
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    // process group already gone
  }
}
