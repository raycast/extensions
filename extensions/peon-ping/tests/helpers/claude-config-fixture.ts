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
  hookDir: string;
  configFilePath: string;
  pausedFilePath: string;
  packsDir: string;
  scriptPath: string;
  writeConfigJson(content: Record<string, unknown>): void;
  createPackFixture(
    name: string,
    options?: {
      displayName?: string;
      manifestFileName?: "openpeon.json" | "manifest.json";
      manifest?: Record<string, unknown>;
    },
  ): void;
  touchPaused(): void;
  removePaused(): void;
} {
  const claudeConfigDir = mkdtempSync(join(tmpdir(), "peon-ping-claude-"));
  const hookDir = join(claudeConfigDir, "hooks/peon-ping");
  mkdirSync(hookDir, { recursive: true });
  const packsDir = join(hookDir, "packs");
  mkdirSync(packsDir, { recursive: true });
  const configFilePath = join(hookDir, "config.json");
  const pausedFilePath = join(hookDir, ".paused");
  const scriptPath = join(hookDir, "peon.sh");
  return {
    claudeConfigDir,
    hookDir,
    configFilePath,
    pausedFilePath,
    packsDir,
    scriptPath,
    writeConfigJson(content: Record<string, unknown>) {
      writeFileSync(configFilePath, JSON.stringify(content), "utf-8");
    },
    createPackFixture(name, options) {
      const packDir = join(packsDir, name);
      mkdirSync(packDir, { recursive: true });
      const manifestFileName = options?.manifestFileName ?? "openpeon.json";
      const manifest = options?.manifest ?? {
        name,
        ...(options?.displayName
          ? { display_name: options.displayName }
          : {}),
      };
      writeFileSync(
        join(packDir, manifestFileName),
        JSON.stringify(manifest),
        "utf-8",
      );
    },
    touchPaused() {
      writeFileSync(pausedFilePath, "", "utf-8");
    },
    removePaused() {
      if (existsSync(pausedFilePath)) unlinkSync(pausedFilePath);
    },
  };
}
