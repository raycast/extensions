import fs from "fs";
import path from "path";
import { homedir } from "os";

interface HistoryConfig {
  file: string;
  parser: (content: string) => string[];
}

const HISTORY_CONFIGS: HistoryConfig[] = [
  {
    // Zsh history format: : timestamp:0;command
    file: ".zsh_history",
    parser: parseZshHistory,
  },
  {
    // Bash history format: plain commands
    file: ".bash_history",
    parser: parseBashHistory,
  },
  {
    // Fish history format: - cmd: command
    file: ".local/share/fish/fish_history",
    parser: parseFishHistory,
  },
];

export async function getRecentDirectoriesFromHistory(): Promise<string[]> {
  const directories = new Set<string>();

  for (const config of HISTORY_CONFIGS) {
    const historyPath = path.join(homedir(), config.file);

    if (!fs.existsSync(historyPath)) continue;

    try {
      const content = fs.readFileSync(historyPath, "utf-8");
      const dirs = config.parser(content);

      for (const dir of dirs) {
        const expandedDir = expandPath(dir);
        if (expandedDir && fs.existsSync(expandedDir)) {
          try {
            const stats = fs.statSync(expandedDir);
            if (stats.isDirectory()) {
              directories.add(expandedDir);
            }
          } catch {
            // Skip inaccessible paths
          }
        }
      }

      // Only use the first found history file
      break;
    } catch {
      // Continue to next history file
    }
  }

  return Array.from(directories);
}

function parseZshHistory(content: string): string[] {
  const directories: string[] = [];
  const lines = content.split("\n");

  // Read last 1000 lines for performance
  const recentLines = lines.slice(-1000);

  for (const line of recentLines) {
    // Zsh extended history format: : timestamp:0;command
    const match = line.match(/^:\s*\d+:\d+;(.+)$/) || [null, line];
    const command = match[1]?.trim() || line.trim();

    const dir = extractDirectoryFromCommand(command);
    if (dir) directories.push(dir);
  }

  return directories;
}

function parseBashHistory(content: string): string[] {
  const directories: string[] = [];
  const lines = content.split("\n");

  // Read last 1000 lines for performance
  const recentLines = lines.slice(-1000);

  for (const line of recentLines) {
    const command = line.trim();
    const dir = extractDirectoryFromCommand(command);
    if (dir) directories.push(dir);
  }

  return directories;
}

function parseFishHistory(content: string): string[] {
  const directories: string[] = [];

  // Fish history format: - cmd: command
  const cmdMatches = content.matchAll(/- cmd:\s*(.+)/g);

  for (const match of Array.from(cmdMatches).slice(-1000)) {
    const command = match[1]?.trim();
    if (command) {
      const dir = extractDirectoryFromCommand(command);
      if (dir) directories.push(dir);
    }
  }

  return directories;
}

function extractDirectoryFromCommand(command: string): string | null {
  // Match various cd patterns
  const patterns = [
    /^cd\s+["']?([^"';&|]+)["']?\s*(?:&&|;|$|\|)/,
    /^cd\s+["']?([^"';&|]+)["']?$/,
    /^z\s+["']?([^"';&|]+)["']?/, // zoxide
    /^j\s+["']?([^"';&|]+)["']?/, // autojump
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match && match[1]) {
      const dir = match[1].trim();
      // Skip special cd commands
      if (dir === "-" || dir === "" || dir === "~") continue;
      return dir;
    }
  }

  return null;
}

function expandPath(inputPath: string): string | null {
  if (!inputPath) return null;

  let expanded = inputPath.trim();

  // Expand ~
  if (expanded.startsWith("~/")) {
    expanded = path.join(homedir(), expanded.slice(2));
  } else if (expanded === "~") {
    expanded = homedir();
  }

  // Expand environment variables
  expanded = expanded.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, varName) => {
    return process.env[varName] || "";
  });

  // Handle relative paths - skip them as we can't know the context
  if (!path.isAbsolute(expanded)) {
    // Try common parent directories
    const commonParents = [
      homedir(),
      path.join(homedir(), "Projects"),
      path.join(homedir(), "Code"),
      path.join(homedir(), "Development"),
    ];

    for (const parent of commonParents) {
      const fullPath = path.join(parent, expanded);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  return expanded;
}
