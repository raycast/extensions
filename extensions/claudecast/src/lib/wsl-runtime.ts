import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { getWindowsEnvironment } from "./windows-runtime";
import {
  decodeWslDistributionList,
  decodeWslText,
  isWslWindowsPathInsideRoot,
  parseWslClaudeProbe,
  wslLinuxPathToUnc,
  type WslClaudeProbe,
} from "./wsl-core";

const WSL_TIMEOUT_MS = 10_000;
const WSL_MAX_OUTPUT_BYTES = 1024 * 1024;
const WSL_STORE_CACHE_MS = 30_000;
const WSL_PROBE_COMMAND =
  'printf \'%s\\0%s\\0%s\\0\' "$HOME" "$HOME/.claude" "$(command -v claude 2>/dev/null || true)"';

export interface WslClaudeStore extends WslClaudeProbe {
  windowsConfigDirectory: string;
  windowsProjectsDirectory: string;
}

let cachedStores: Promise<WslClaudeStore[]> | undefined;
let cachedStoresExpiresAt = 0;

export async function discoverWslClaudeStores(
  refresh = false,
): Promise<WslClaudeStore[]> {
  if (!refresh && cachedStores && cachedStoresExpiresAt > Date.now()) {
    return cachedStores;
  }
  cachedStoresExpiresAt = Date.now() + WSL_STORE_CACHE_MS;
  cachedStores = (async () => {
    const distributions = decodeWslDistributionList(
      await runWsl(["--list", "--quiet"]),
    );
    const stores: WslClaudeStore[] = [];
    for (const distribution of distributions) {
      let probe: WslClaudeProbe | null;
      try {
        probe = parseWslClaudeProbe(
          distribution,
          await runWsl([
            "--distribution",
            distribution,
            "--exec",
            "sh",
            "-lc",
            WSL_PROBE_COMMAND,
          ]),
        );
      } catch {
        continue;
      }
      if (!probe) continue;
      const windowsHomeDirectory = await resolveAccessibleUncPath(
        distribution,
        probe.home,
      );
      const windowsConfigDirectory = await resolveAccessibleUncPath(
        distribution,
        probe.claudeConfigDirectory,
      );
      if (!windowsHomeDirectory || !windowsConfigDirectory) continue;
      const windowsProjectsDirectory = path.win32.join(
        windowsConfigDirectory,
        "projects",
      );
      try {
        const [realHome, realConfig, realProjects, projectsStat] =
          await Promise.all([
            fs.promises.realpath(windowsHomeDirectory),
            fs.promises.realpath(windowsConfigDirectory),
            fs.promises.realpath(windowsProjectsDirectory),
            fs.promises.stat(windowsProjectsDirectory),
          ]);
        if (
          !projectsStat.isDirectory() ||
          !isWslWindowsPathInsideRoot(realConfig, realHome) ||
          !isWslWindowsPathInsideRoot(realProjects, realConfig)
        ) {
          continue;
        }
      } catch {
        continue;
      }
      stores.push({
        ...probe,
        windowsConfigDirectory,
        windowsProjectsDirectory,
      });
    }
    return stores;
  })().catch((error) => {
    cachedStores = undefined;
    cachedStoresExpiresAt = 0;
    throw error;
  });
  return cachedStores;
}

async function resolveAccessibleUncPath(
  distribution: string,
  linuxPath: string,
): Promise<string | null> {
  for (const host of ["wsl.localhost", "wsl$"]) {
    const candidate = wslLinuxPathToUnc(distribution, linuxPath, host);
    try {
      await fs.promises.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

async function runWsl(args: string[]): Promise<Uint8Array> {
  const env = await getWindowsEnvironment();
  return new Promise((resolve, reject) => {
    execFile(
      "wsl.exe",
      args,
      {
        encoding: "buffer",
        env,
        timeout: WSL_TIMEOUT_MS,
        maxBuffer: WSL_MAX_OUTPUT_BYTES,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          const message = decodeWslText(new Uint8Array(stderr));
          reject(new Error(message.trim() || "WSL Command Failed"));
          return;
        }
        resolve(new Uint8Array(stdout));
      },
    );
  });
}
