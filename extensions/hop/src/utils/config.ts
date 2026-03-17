import { homedir } from "os";
import { readFileSync, existsSync } from "fs";
import { parse } from "yaml";
import path from "path";
import { getPreferenceValues } from "@raycast/api";

export interface Connection {
  id: string;
  host: string;
  user?: string;
  port?: number;
  project?: string;
  env?: string;
  tags?: string[];
  identity_file?: string;
  proxy_jump?: string;
  forward_agent?: boolean;
  options?: Record<string, string>;
}

interface HopConfig {
  version: number;
  defaults?: {
    user?: string;
    port?: number;
  };
  connections: Connection[];
  groups?: Record<string, unknown>;
}

interface HistoryEntry {
  id: string;
  last_used: string;
  use_count: number;
}

interface HopHistory {
  connections: HistoryEntry[];
}

// Preferences interface is auto-generated from package.json by Raycast
type Preferences = {
  terminal: string;
  customTerminal: string;
  configPath: string;
};

function expandTilde(filePath: string): string {
  if (filePath.startsWith("~/")) {
    return path.join(homedir(), filePath.slice(2));
  }
  if (filePath === "~") {
    return homedir();
  }
  return filePath;
}

export function getConfigPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.configPath) return expandTilde(preferences.configPath);

  const envPath = process.env.HOP_CONFIG;
  if (envPath) return expandTilde(envPath);

  return path.join(homedir(), ".config", "hop", "config.yaml");
}

export function getHistoryPath(): string {
  return path.join(homedir(), ".config", "hop", "history.yaml");
}

export function loadHistory(): Map<string, HistoryEntry> {
  const historyPath = getHistoryPath();
  const historyMap = new Map<string, HistoryEntry>();

  if (!existsSync(historyPath)) {
    return historyMap;
  }

  try {
    const content = readFileSync(historyPath, "utf-8");
    const history: HopHistory = parse(content);

    if (history?.connections) {
      for (const entry of history.connections) {
        historyMap.set(entry.id, entry);
      }
    }
  } catch (error) {
    console.error("Failed to load hop history:", error);
  }

  return historyMap;
}

export interface LoadConfigResult {
  connections: Connection[];
  error?: string;
}

export function loadHopConfig(): LoadConfigResult {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return { connections: [], error: `Config file not found: ${configPath}` };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config: HopConfig = parse(content);

    if (!config?.connections) {
      return { connections: [] };
    }

    // Apply defaults
    const connections = config.connections.map((conn) => ({
      ...conn,
      user: conn.user || config.defaults?.user || process.env.USER,
      port: conn.port || config.defaults?.port || 22,
    }));

    return { connections };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { connections: [], error: `Failed to parse config: ${message}` };
  }
}

function shellEscape(arg: string): string {
  // If the argument contains no special characters, return as-is
  if (/^[a-zA-Z0-9._:/@-]+$/.test(arg)) {
    return arg;
  }
  // Wrap in single quotes and escape any existing single quotes
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

export function buildSSHCommand(conn: Connection): string {
  let cmd = "ssh";

  if (conn.port && conn.port !== 22) {
    cmd += ` -p ${conn.port}`;
  }

  if (conn.identity_file) {
    cmd += ` -i ${shellEscape(conn.identity_file)}`;
  }

  if (conn.proxy_jump) {
    cmd += ` -J ${shellEscape(conn.proxy_jump)}`;
  }

  if (conn.forward_agent) {
    cmd += ` -A`;
  }

  // Add custom options
  if (conn.options) {
    for (const [key, value] of Object.entries(conn.options)) {
      cmd += ` -o ${shellEscape(`${key}=${value}`)}`;
    }
  }

  const destination = conn.user ? `${conn.user}@${conn.host}` : conn.host;
  cmd += ` ${shellEscape(destination)}`;

  return cmd;
}

export function getTerminalApp(): string | undefined {
  const preferences = getPreferenceValues<Preferences>();

  const terminalMap: Record<string, string> = {
    terminal: "Terminal",
    iterm: "iTerm",
    warp: "Warp",
    alacritty: "Alacritty",
    kitty: "kitty",
  };

  if (preferences.terminal === "other" && preferences.customTerminal) {
    return preferences.customTerminal;
  }

  return terminalMap[preferences.terminal];
}
