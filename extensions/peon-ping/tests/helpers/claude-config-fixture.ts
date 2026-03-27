import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function createClaudeConfigFixture(): {
  claudeConfigDir: string;
  configFilePath: string;
  writeConfigJson(content: Record<string, unknown>): void;
} {
  const claudeConfigDir = mkdtempSync(join(tmpdir(), "peon-ping-claude-"));
  const hookDir = join(claudeConfigDir, "hooks/peon-ping");
  mkdirSync(hookDir, { recursive: true });
  const configFilePath = join(hookDir, "config.json");
  return {
    claudeConfigDir,
    configFilePath,
    writeConfigJson(content: Record<string, unknown>) {
      writeFileSync(configFilePath, JSON.stringify(content), "utf-8");
    },
  };
}
