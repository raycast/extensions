import { spawnSync } from "child_process";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { Color } from "@raycast/api";

// Resource usage thresholds
export const RAM_THRESHOLDS = {
  HIGH: 500, // MB
  MEDIUM: 200, // MB
  MODERATE: 100, // MB
} as const;

export const CPU_THRESHOLDS = {
  HIGH: 50, // %
  MEDIUM: 20, // %
} as const;

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPProcess {
  pid: number;
  name: string;
  command: string;
  fullCommand: string;
  ramUsageMB: number;
  ramPercentage: number;
  cpuPercentage: number;
  source: "claude-desktop" | "vscode" | "cursor" | "claude-code" | "unknown";
  configPath?: string;
  startTime?: string;
}

export interface MCPConfig {
  source: "claude-desktop" | "vscode" | "cursor" | "claude-code";
  path: string;
  servers: Record<string, MCPServerConfig>;
}

// Get all MCP configuration files
export function getMCPConfigs(): MCPConfig[] {
  const configs: MCPConfig[] = [];
  const home = homedir();

  // Claude Desktop config paths
  const claudeDesktopPaths = [
    path.join(home, "Library/Application Support/Claude/claude_desktop_config.json"),
    path.join(home, ".config/claude/claude_desktop_config.json"),
  ];

  for (const configPath of claudeDesktopPaths) {
    if (existsSync(configPath)) {
      try {
        const content = JSON.parse(readFileSync(configPath, "utf-8"));
        if (content.mcpServers) {
          configs.push({
            source: "claude-desktop",
            path: configPath,
            servers: content.mcpServers,
          });
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  // VS Code MCP config paths
  const vscodePaths = [
    path.join(home, "Library/Application Support/Code/User/mcp.json"),
    path.join(home, ".vscode/mcp.json"),
  ];

  for (const configPath of vscodePaths) {
    if (existsSync(configPath)) {
      try {
        const content = JSON.parse(readFileSync(configPath, "utf-8"));
        const servers = content.mcpServers || content.servers || content;
        if (servers && typeof servers === "object" && !Array.isArray(servers)) {
          configs.push({
            source: "vscode",
            path: configPath,
            servers: servers,
          });
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  // Cursor MCP config paths
  const cursorPaths = [
    path.join(home, ".cursor/mcp.json"),
    path.join(home, "Library/Application Support/Cursor/cursor_desktop_config.json"),
  ];

  for (const configPath of cursorPaths) {
    if (existsSync(configPath)) {
      try {
        const content = JSON.parse(readFileSync(configPath, "utf-8"));
        const servers = content.mcpServers || content.servers || content;
        if (servers && typeof servers === "object" && !Array.isArray(servers)) {
          configs.push({
            source: "cursor",
            path: configPath,
            servers: servers,
          });
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  // Claude Code config paths
  const claudeCodePaths = [
    path.join(home, ".claude/settings.json"),
    path.join(home, ".config/claude-code/settings.json"),
  ];

  for (const configPath of claudeCodePaths) {
    if (existsSync(configPath)) {
      try {
        const content = JSON.parse(readFileSync(configPath, "utf-8"));
        if (content.mcpServers) {
          configs.push({
            source: "claude-code",
            path: configPath,
            servers: content.mcpServers,
          });
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  return configs;
}

// Get running MCP processes
export function getMCPProcesses(): MCPProcess[] {
  const processes: MCPProcess[] = [];
  const configs = getMCPConfigs();

  // Build a map of known MCP commands for matching
  const knownMCPCommands = new Map<string, { name: string; source: MCPConfig["source"]; configPath: string }>();

  for (const config of configs) {
    for (const [serverName, serverConfig] of Object.entries(config.servers)) {
      const cmdKey = serverConfig.command + (serverConfig.args?.length ? " " + serverConfig.args.join(" ") : "");
      knownMCPCommands.set(cmdKey, {
        name: serverName,
        source: config.source,
        configPath: config.path,
      });
    }
  }

  // Generic commands that are too broad to use alone for matching
  const GENERIC_COMMANDS = new Set(["node", "python", "python3", "npx", "uvx", "deno"]);

  try {
    // Get all processes with memory info using ps
    // Format: PID PPID %CPU %MEM RSS(KB) ELAPSED COMMAND
    // Using etime (elapsed time) instead of lstart for more robust parsing across locales
    // etime format: [[DD-]HH:]MM:SS (e.g., "5-12:34:56" or "12:34" or "1:23:45")
    const psOutput = execSync(
      `ps -eo pid,ppid,pcpu,%mem,rss,etime,command | grep -E "(node|python|npx|uvx|deno)" | grep -v "grep"`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    ).trim();

    if (!psOutput) return processes;

    const lines = psOutput.split("\n");

    // Collect candidate processes first (without CPU from top)
    interface Candidate {
      pid: number;
      ppid: number;
      cpuPercent: number;
      memPercent: string;
      rssKB: number;
      etime: string;
      fullCommand: string;
    }
    const candidates: Candidate[] = [];

    for (const line of lines) {
      // Parse ps output with pcpu field added
      // Groups: (1)PID (2)PPID (3)%CPU (4)%MEM (5)RSS (6)ETIME (7)COMMAND
      const match = line.match(/^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+([\d-:]+)\s+(.+)$/);

      if (!match) continue;

      const [, pidStr, ppidStr, cpuPercent, memPercent, rssKB, etime, fullCommand] = match;
      const pid = parseInt(pidStr, 10);
      const ppid = parseInt(ppidStr, 10);

      if (!isValidPID(pid)) continue;

      const isMCPProcess = isMCPServerProcess(fullCommand, configs);
      if (!isMCPProcess) continue;

      candidates.push({
        pid,
        ppid,
        cpuPercent: parseFloat(cpuPercent),
        memPercent,
        rssKB: parseInt(rssKB, 10),
        etime,
        fullCommand,
      });
    }

    for (const { pid, ppid, cpuPercent, memPercent, rssKB, etime, fullCommand } of candidates) {
      const ramMB = Math.round(rssKB / 1024);

      // Try to find the server name from config
      let serverName = "Unknown MCP Server";
      let source: MCPProcess["source"] = "unknown";
      let configPath: string | undefined;

      // Check against known MCP commands — strict matching to avoid false positives
      for (const [cmdPattern, info] of knownMCPCommands) {
        const cmdBase = cmdPattern.split(" ")[0];
        const isGeneric = GENERIC_COMMANDS.has(cmdBase);

        // Exact pattern match first
        if (fullCommand.includes(cmdPattern)) {
          serverName = info.name;
          source = info.source;
          configPath = info.configPath;
          break;
        }

        // Only match specific tokens (non-generic, > 3 chars) to avoid false positives on "node"
        if (!isGeneric) {
          const tokens = cmdPattern.split(" ");
          const uniqueTokens = tokens.filter((t) => t.length > 3);
          if (uniqueTokens.length > 0 && uniqueTokens.every((token) => fullCommand.includes(token))) {
            serverName = info.name;
            source = info.source;
            configPath = info.configPath;
            break;
          }
        }
      }

      // If not found in config, try to extract name from command
      if (serverName === "Unknown MCP Server") {
        serverName = extractServerName(fullCommand);
      }

      // Determine source from parent process if not found
      if (source === "unknown") {
        source = determineSourceFromParent(ppid);
      }

      processes.push({
        pid,
        name: serverName,
        command: fullCommand.split(" ")[0],
        fullCommand,
        ramUsageMB: ramMB,
        ramPercentage: parseFloat(memPercent),
        cpuPercentage: cpuPercent,
        source,
        configPath,
        startTime: formatElapsedTime(etime),
      });
    }
  } catch {
    // ps command failed or no processes found
  }

  return processes;
}

// Check if a process looks like an MCP server
function isMCPServerProcess(command: string, configs: MCPConfig[]): boolean {
  const lowerCmd = command.toLowerCase();

  // Direct MCP indicators
  if (lowerCmd.includes("mcp") || lowerCmd.includes("model-context-protocol")) {
    return true;
  }

  // Check if command matches any configured server
  for (const config of configs) {
    for (const serverConfig of Object.values(config.servers)) {
      if (command.includes(serverConfig.command)) {
        // If no args configured, command match alone is sufficient
        if (!serverConfig.args || serverConfig.args.length === 0) {
          return true;
        }
        // If args are configured, ALL must match (not just one) to avoid false positives
        if (serverConfig.args.length > 0 && serverConfig.args.every((arg) => command.includes(arg))) {
          return true;
        }
      }
    }
  }

  // Common MCP server patterns
  const mcpPatterns = [
    /mcp[-_]?server/i,
    /@modelcontextprotocol/i,
    /stdio.*server/i,
    /server\.js.*stdio/i,
    /server\.py.*stdio/i,
    /uvx.*mcp/i,
    /npx.*mcp/i,
    /-mcp$/i,
    /mcp-/i,
  ];

  return mcpPatterns.some((pattern) => pattern.test(command));
}

// Extract server name from command
function extractServerName(command: string): string {
  // Try to find MCP package name
  const mcpMatch = command.match(/(@[\w-]+\/)?[\w-]*mcp[\w-]*/i);
  if (mcpMatch) {
    return mcpMatch[0];
  }

  // Try to find server name from file path
  const pathMatch = command.match(/\/([^/]+)\.(js|ts|py)(\s|$)/);
  if (pathMatch) {
    return pathMatch[1].replace(/[-_]?server[-_]?/i, "").replace(/-/g, " ") || pathMatch[1];
  }

  // Try to get from npx/uvx package
  const pkgMatch = command.match(/(npx|uvx)\s+(@?[\w-]+\/[\w-]+|[\w-]+)/);
  if (pkgMatch) {
    return pkgMatch[2];
  }

  return "MCP Server";
}

// Try to determine source from parent process
function determineSourceFromParent(ppid: number): MCPProcess["source"] {
  if (!isValidPID(ppid)) return "unknown";
  try {
    const parentCmd = execSync(`ps -p ${ppid} -o command=`, { encoding: "utf-8" }).trim().toLowerCase();

    if (parentCmd.includes("claude-code") || parentCmd.includes("claude_code")) {
      return "claude-code";
    }
    if (parentCmd.includes("claude") && parentCmd.includes("desktop")) {
      return "claude-desktop";
    }
    if (parentCmd.includes("cursor")) {
      return "cursor";
    }
    if (parentCmd.includes("code") || parentCmd.includes("vscode")) {
      return "vscode";
    }
  } catch {
    // Parent process lookup failed
  }

  return "unknown";
}

// Format elapsed time from ps etime format to human-readable string
// etime format: [[DD-]HH:]MM:SS (e.g., "5-12:34:56" or "12:34" or "1:23:45")
function formatElapsedTime(etime: string): string {
  try {
    const parts = etime.split("-");
    let days = 0;
    let timeStr = etime;

    // Check if days are present (format: DD-HH:MM:SS)
    if (parts.length === 2) {
      days = parseInt(parts[0], 10);
      timeStr = parts[1];
    }

    const timeParts = timeStr.split(":").map((p) => parseInt(p, 10));
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (timeParts.length === 3) {
      [hours, minutes, seconds] = timeParts;
    } else if (timeParts.length === 2) {
      [minutes, seconds] = timeParts;
    } else {
      return etime; // Fallback to raw value
    }

    // Add days to hours
    hours += days * 24;

    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    if (minutes > 0) {
      return `${minutes}m ago`;
    }
    if (seconds > 0) {
      return `${seconds}s ago`;
    }
    return "Just started";
  } catch {
    return etime;
  }
}

// Validate PID to prevent command injection
function isValidPID(pid: number): boolean {
  return Number.isInteger(pid) && pid > 0 && pid < 99999;
}

// Kill a process by PID (using spawn for security)
export function killProcess(pid: number, force = false): boolean {
  if (!isValidPID(pid)) {
    console.error(`Invalid PID: ${pid}`);
    return false;
  }

  try {
    const signal = force ? "-9" : "-15";
    const result = spawnSync("kill", [signal, pid.toString()]);
    return result.status === 0;
  } catch {
    return false;
  }
}

// Get source display name
export function getSourceDisplayName(source: MCPProcess["source"]): string {
  switch (source) {
    case "claude-desktop":
      return "Claude Desktop";
    case "vscode":
      return "VS Code";
    case "cursor":
      return "Cursor";
    case "claude-code":
      return "Claude Code";
    default:
      return "Unknown";
  }
}

// Get color for source application
export function getSourceColor(source: MCPProcess["source"]): Color {
  switch (source) {
    case "claude-desktop":
      return Color.Orange;
    case "vscode":
      return Color.Blue;
    case "cursor":
      return Color.Purple;
    case "claude-code":
      return Color.Green;
    default:
      return Color.SecondaryText;
  }
}

// Get color based on RAM usage
export function getRAMColor(ramMB: number): Color {
  if (ramMB >= RAM_THRESHOLDS.HIGH) return Color.Red;
  if (ramMB >= RAM_THRESHOLDS.MEDIUM) return Color.Orange;
  if (ramMB >= RAM_THRESHOLDS.MODERATE) return Color.Yellow;
  return Color.Green;
}

// Get color based on CPU usage
export function getCPUColor(cpuPercent: number): Color {
  if (cpuPercent > CPU_THRESHOLDS.HIGH) return Color.Red;
  if (cpuPercent > CPU_THRESHOLDS.MEDIUM) return Color.Orange;
  return Color.SecondaryText;
}

// Format RAM usage
export function formatRAMUsage(ramMB: number): string {
  if (ramMB >= 1024) {
    return `${(ramMB / 1024).toFixed(1)} GB`;
  }
  return `${ramMB} MB`;
}
