import { homedir } from "os";
import { join } from "path";

export const CODEX_APP_URL = "https://developers.openai.com/codex/app";
export const CODEX_SETTINGS_URL = "codex://settings";

export type CodexPaths = {
  codexHome: string;
  configPath: string;
  historyPath: string;
  keybindingsPath: string;
};

export function getCodexPaths(): CodexPaths {
  const codexHome = process.env.CODEX_HOME?.trim() || join(homedir(), ".codex");

  return {
    codexHome,
    configPath: join(codexHome, "config.toml"),
    historyPath: join(codexHome, "transcription-history.jsonl"),
    keybindingsPath: join(codexHome, "keybindings.json"),
  };
}
