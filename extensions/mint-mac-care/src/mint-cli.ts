import { existsSync, realpathSync } from "node:fs";

const CLI_CANDIDATES = [
  process.env.MINT_CLI_PATH,
  "/opt/homebrew/bin/mint-cli",
  "/usr/local/bin/mint-cli",
  "/Applications/Mint.app/Contents/Resources/mint-cli",
].filter((candidate): candidate is string => Boolean(candidate));

export function findMintCLI(): string | undefined {
  for (const candidate of CLI_CANDIDATES) {
    if (!existsSync(candidate)) continue;

    try {
      return realpathSync(candidate);
    } catch {
      return candidate;
    }
  }

  return undefined;
}

export function parseJSON<T>(value: string | undefined): T | undefined {
  if (!value) return undefined;

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function formatBytes(bytes = 0): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unit;
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function shortPath(path: string): string {
  const home = process.env.HOME;
  return home && path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}
