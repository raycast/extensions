import { join } from "node:path";

export type PeonPingResolvedPaths = {
  claudeConfigDir: string;
  configFilePath: string;
  pausedFilePath: string;
  scriptPath: string;
};

export type ResolvePeonPingPathsInput = {
  raycastClaudeConfigDir?: string | null;
  claudeConfigDirEnv?: string | null;
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
  return {
    claudeConfigDir,
    configFilePath: join(hookDir, "config.json"),
    pausedFilePath: join(hookDir, ".paused"),
    scriptPath: join(hookDir, "peon.sh"),
  };
}
