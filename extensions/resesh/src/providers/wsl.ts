import { execFile, spawn } from "child_process";
import { createInterface } from "readline";
import { getPreferenceValues } from "@raycast/api";

const isWindows = process.platform === "win32";

export const WSL_PREFIX = "wsl:";

let distroCache: string[] | null = null;

export function wslEnabled(): boolean {
  if (!isWindows) return false;
  return !!getPreferenceValues<{ includeWsl?: boolean }>().includeWsl;
}

export async function listWslDistros(): Promise<string[]> {
  if (!isWindows) return [];
  if (distroCache) return distroCache;

  return new Promise((resolve) => {
    execFile("wsl", ["-l", "-q"], { encoding: "utf16le", timeout: 5000 }, (err, stdout) => {
      if (err) {
        resolve([]);
        return;
      }
      const distros = stdout
        .replace(/\0/g, "")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      distroCache = distros;
      resolve(distros);
    });
  });
}

export function buildWslKey(distro: string, dir: string): string {
  return `${WSL_PREFIX}${distro}:${dir}`;
}

export function wslUncPath(distro: string, linuxPath: string): string {
  return `\\\\wsl$\\${distro}${linuxPath.replace(/\//g, "\\")}`;
}

export function parseWslFilter(projectFilter: string | null): { distro: string; dir: string } | null {
  if (!projectFilter?.startsWith(WSL_PREFIX)) return null;
  const rest = projectFilter.slice(WSL_PREFIX.length);
  const colonIdx = rest.indexOf(":");
  if (colonIdx === -1) return null;
  return { distro: rest.slice(0, colonIdx), dir: rest.slice(colonIdx + 1) };
}

// --- Generic exec helper (for lightweight discover scripts) ---

export async function execWsl(distro: string, script: string): Promise<string> {
  if (!isWindows) return "";

  return new Promise((resolve) => {
    execFile("wsl", ["-d", distro, "-e", "sh", "-c", script], { timeout: 15000 }, (err, stdout) => {
      resolve(err ? "" : stdout);
    });
  });
}

// --- Generic streaming scanner (for session file contents via \tFILE\t protocol) ---

export interface WslScanCallbacks {
  onFileStart(projectDir: string, sessionId: string, mtime: number): void;
  onRecord(record: Record<string, unknown>): void;
  onFileEnd(): void;
}

export async function streamWslFiles(
  distro: string,
  script: string,
  scriptArgs: string[],
  cb: WslScanCallbacks,
): Promise<void> {
  if (!isWindows) return;

  const args = ["-d", distro, "-e", "sh", "-c", script, "_", ...scriptArgs];

  return new Promise((resolve) => {
    const proc = spawn("wsl", args);
    const timer = setTimeout(() => proc.kill(), 30000);
    const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity });

    let inFile = false;

    rl.on("line", (line) => {
      if (line.startsWith("\tFILE\t")) {
        if (inFile) cb.onFileEnd();
        const parts = line.split("\t");
        cb.onFileStart(parts[2], parts[3], Number(parts[4]) * 1000);
        inFile = true;
      } else if (inFile && line.trim()) {
        try {
          cb.onRecord(JSON.parse(line));
        } catch {
          /* skip malformed lines */
        }
      }
    });

    rl.on("close", () => {
      clearTimeout(timer);
      if (inFile) cb.onFileEnd();
      resolve();
    });

    proc.on("error", () => {
      clearTimeout(timer);
      resolve();
    });

    proc.stderr.resume();
  });
}
