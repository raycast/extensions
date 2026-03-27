import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function createClaudeConfigFixture(): {
  claudeConfigDir: string;
  configFilePath: string;
  pausedFilePath: string;
  scriptPath: string;
  writeConfigJson(content: Record<string, unknown>): void;
  touchPaused(): void;
  removePaused(): void;
} {
  const claudeConfigDir = mkdtempSync(join(tmpdir(), "peon-ping-claude-"));
  const hookDir = join(claudeConfigDir, "hooks/peon-ping");
  mkdirSync(hookDir, { recursive: true });
  const configFilePath = join(hookDir, "config.json");
  const pausedFilePath = join(hookDir, ".paused");
  const scriptPath = join(hookDir, "peon.sh");
  return {
    claudeConfigDir,
    configFilePath,
    pausedFilePath,
    scriptPath,
    writeConfigJson(content: Record<string, unknown>) {
      writeFileSync(configFilePath, JSON.stringify(content), "utf-8");
    },
    touchPaused() {
      writeFileSync(pausedFilePath, "", "utf-8");
    },
    removePaused() {
      if (existsSync(pausedFilePath)) unlinkSync(pausedFilePath);
    },
  };
}
