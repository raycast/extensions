import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { CONFIG_PATH } from "./paths";
import { Config } from "./types";

export const DEFAULT_DEEPLINK_BASE = "raycast://extensions/silencerichard/agent-inbox";

export const DEFAULT_CONFIG: Config = {
  notifications: true,
  contentSearchEnabled: false,
  deeplinkBase: DEFAULT_DEEPLINK_BASE,
  resumeTerminal: "terminal",
};

/** ~/.sessions/config.json is shared by the Raycast extension and the hook CLI. */
export function readConfig(path = CONFIG_PATH): Config {
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(patch: Partial<Config>, path = CONFIG_PATH): Config {
  const current = readConfig(path);
  const next = { ...current, ...patch };
  if (JSON.stringify(next) !== JSON.stringify(current) || !existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(next, null, 2) + "\n");
  }
  return next;
}

export interface ExtensionPreferences {
  notifications: boolean;
  contentSearchEnabled: boolean;
  resumeTerminal: string;
}

/** Raycast owns user preferences; other CLI/channel settings remain intact. */
export function syncPreferences(preferences: ExtensionPreferences, deeplinkBase: string, path = CONFIG_PATH): Config {
  return writeConfig(
    {
      notifications: preferences.notifications,
      contentSearchEnabled: preferences.contentSearchEnabled,
      resumeTerminal:
        preferences.resumeTerminal === "iterm" || preferences.resumeTerminal === "ghostty" ? preferences.resumeTerminal : "terminal",
      deeplinkBase,
    },
    path,
  );
}
