import { existsSync } from "node:fs";
import { join } from "node:path";

export type PeonPingResolvedPaths = {
  claudeConfigDir: string;
  installDir: string;
  peonDir: string;
  packsDir: string;
  configFilePath: string;
  pausedFilePath: string;
  scriptPath: string;
};

export type ResolvePeonPingPathsInput = {
  raycastClaudeConfigDir?: string | null;
  claudeConfigDirEnv?: string | null;
  claudePeonDirEnv?: string | null;
  homeDir: string;
};

function pickClaudeConfigDir(input: ResolvePeonPingPathsInput): string {
  const fromPreference = input.raycastClaudeConfigDir?.trim();
  if (fromPreference) return fromPreference;
  const fromEnv = input.claudeConfigDirEnv?.trim();
  if (fromEnv) return fromEnv;
  return join(input.homeDir, ".claude");
}

export function resolvePeonPingPaths(
  input: ResolvePeonPingPathsInput,
): PeonPingResolvedPaths {
  const claudeConfigDir = pickClaudeConfigDir(input);
  const hookDir = join(claudeConfigDir, "hooks/peon-ping");
  const installDir = input.claudePeonDirEnv?.trim() || hookDir;
  const peonDir = existsSync(join(installDir, "packs"))
    ? installDir
    : existsSync(join(hookDir, "packs"))
      ? hookDir
      : join(input.homeDir, ".openpeon");
  const packsDir = join(peonDir, "packs");
  return {
    claudeConfigDir,
    installDir,
    peonDir,
    packsDir,
    configFilePath: join(peonDir, "config.json"),
    pausedFilePath: join(peonDir, ".paused"),
    scriptPath: join(installDir, "peon.sh"),
  };
}
