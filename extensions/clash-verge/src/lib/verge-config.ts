import { getPreferenceValues } from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface VergeGuiConfigState {
  available: boolean;
  path?: string;
  tunEnabled?: boolean;
  systemProxyEnabled?: boolean;
  readError?: string;
}

export function getVergeGuiConfigState(): VergeGuiConfigState {
  const configPath = resolveVergeConfigPath();
  if (!configPath) {
    return {
      available: false,
      readError: "verge.yaml not found. Set a custom path in extension preferences if needed.",
    };
  }

  try {
    const content = readFileSync(configPath, "utf8");
    return {
      available: true,
      path: configPath,
      tunEnabled: extractBooleanValue(content, "enable_tun_mode"),
      systemProxyEnabled: extractBooleanValue(content, "enable_system_proxy"),
    };
  } catch (error) {
    return {
      available: false,
      path: configPath,
      readError: error instanceof Error ? error.message : "Failed to read verge.yaml",
    };
  }
}

function resolveVergeConfigPath(): string | undefined {
  const preferences = getPreferenceValues<Preferences>();
  const customPath = preferences.vergeConfigPath?.trim();
  if (customPath && existsSync(customPath)) {
    return customPath;
  }

  const candidates = [
    join(homedir(), "Library", "Application Support", "io.github.clash-verge-rev.clash-verge-rev", "verge.yaml"),
    join(homedir(), "Library", "Application Support", "io.github.clash-verge-rev.clash-verge", "verge.yaml"),
  ];

  return candidates.find((path) => existsSync(path));
}

function extractBooleanValue(content: string, key: string): boolean | undefined {
  const match = content.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) {
    return undefined;
  }

  const raw = match[1]
    .split("#")[0]
    .trim()
    .replace(/^['"]|['"]$/g, "");
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }

  return undefined;
}
