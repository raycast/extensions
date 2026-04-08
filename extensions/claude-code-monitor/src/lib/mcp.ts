import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { McpServerInfo, InstalledPluginsFile } from "../types";
import { readJsonFile, buildClaudeEnv, getShellProxy } from "./fs-utils";

const execFileAsync = promisify(execFile);

const HOME = os.homedir();
const CLAUDE_JSON_PATH = path.join(HOME, ".claude.json");
const SETTINGS_PATH = path.join(HOME, ".claude", "settings.json");
const INSTALLED_PLUGINS_PATH = path.join(
  HOME,
  ".claude",
  "plugins",
  "installed_plugins.json",
);

function buildEnv() {
  return buildClaudeEnv(getShellProxy());
}

interface McpConfigEntry {
  type?: string;
  command?: string;
  url?: string;
  args?: string[];
  env?: Record<string, string>;
}

function readUserMcpConfig(): Record<string, McpConfigEntry> {
  const data = readJsonFile<Record<string, unknown>>(CLAUDE_JSON_PATH);
  return (data?.mcpServers as Record<string, McpConfigEntry>) ?? {};
}

function parseListOutput(output: string): Map<string, string> {
  const statusMap = new Map<string, string>();
  for (const line of output.split("\n")) {
    const match = line.match(/^(.+?):\s+.+\s+-\s+(.+)$/);
    if (match) {
      statusMap.set(match[1].trim(), match[2].trim());
    }
  }
  return statusMap;
}

function normalizeStatus(raw: string): { status: string; detail?: string } {
  // Strip leading symbols like ✓ ✗ !
  const cleaned = raw.replace(/^[✓✗!]\s*/, "").trim();
  if (raw.includes("Connected")) return { status: "Connected" };
  if (raw.includes("authentication")) return { status: "Needs Auth" };
  if (raw.includes("Failed"))
    return { status: "Unreachable", detail: cleaned || undefined };
  return { status: cleaned || "Unknown", detail: cleaned || undefined };
}

export async function loadAllMcpServers(): Promise<McpServerInfo[]> {
  const userConfig = readUserMcpConfig();

  // Get real-time status from `claude mcp list`
  let statusMap = new Map<string, string>();
  try {
    const { stdout, stderr } = await execFileAsync("claude", ["mcp", "list"], {
      timeout: 60000,
      env: buildEnv(),
    });
    statusMap = parseListOutput(stdout || stderr);
  } catch {
    // Fall back to config-only view
  }

  const servers: McpServerInfo[] = [];
  const seen = new Set<string>();

  // 1. User MCPs from ~/.claude.json (with details + status)
  for (const [name, config] of Object.entries(userConfig)) {
    seen.add(name);
    const args = config.args?.join(" ") || "";
    const envEntries = config.env
      ? Object.entries(config.env)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")
      : undefined;

    const { status, detail } = normalizeStatus(statusMap.get(name) || "");
    servers.push({
      name,
      status,
      statusDetail: detail,
      type: config.type || "stdio",
      category: "user",
      command: config.command,
      url: config.url,
      args: args || undefined,
      env: envEntries,
    });
  }

  // 2. Remaining servers from list output (cloud + builtin)
  for (const [name, rawStatus] of statusMap) {
    if (seen.has(name)) continue;

    let category: "cloud" | "builtin";
    if (name.startsWith("claude.ai")) {
      category = "cloud";
    } else {
      category = "builtin";
    }

    const { status, detail } = normalizeStatus(rawStatus);
    servers.push({
      name,
      status,
      statusDetail: detail,
      type: "",
      category,
    });
  }

  // 3. If list failed, fill in cloud/builtin from config files
  if (statusMap.size === 0) {
    addFallbackServers(servers, seen);
  }

  return servers;
}

function addFallbackServers(servers: McpServerInfo[], seen: Set<string>) {
  // Cloud servers
  const clouds = [
    {
      name: "claude.ai Google Calendar",
      url: "https://gcal.mcp.claude.com/mcp",
    },
    { name: "claude.ai Gmail", url: "https://gmail.mcp.claude.com/mcp" },
    { name: "claude.ai Notion", url: "https://mcp.notion.com/mcp" },
  ];
  for (const c of clouds) {
    servers.push({
      name: c.name,
      status: "Unknown",
      type: "http",
      category: "cloud",
      url: c.url,
    });
  }

  // Built-in from enabled plugins
  const settings = readJsonFile<Record<string, unknown>>(SETTINGS_PATH);
  const ep = (settings?.enabledPlugins as Record<string, boolean>) ?? {};
  const installed = readJsonFile<InstalledPluginsFile>(INSTALLED_PLUGINS_PATH);

  for (const [key, enabled] of Object.entries(ep)) {
    if (!enabled) continue;
    const installs = installed?.plugins?.[key];
    if (!installs?.length) continue;

    const mcpPath = path.join(installs[0].installPath, ".mcp.json");
    if (!fs.existsSync(mcpPath)) continue;

    const mcpData = readJsonFile<Record<string, unknown>>(mcpPath);
    if (!mcpData) continue;

    const mcpServers =
      (mcpData.mcpServers as Record<string, McpConfigEntry>) ?? mcpData;
    const pluginName = key.split("@")[0];

    for (const [sName, config] of Object.entries(mcpServers)) {
      if (sName === "mcpServers") continue;
      const fullName = `plugin:${pluginName}:${sName}`;
      if (seen.has(fullName)) continue;
      servers.push({
        name: fullName,
        status: "Unknown",
        type: config.type || "stdio",
        category: "builtin",
        command: config.command,
        url: config.url,
      });
    }
  }
}

export async function removeMcpServer(name: string): Promise<void> {
  await execFileAsync("claude", ["mcp", "remove", name], {
    timeout: 15000,
    env: buildEnv(),
  });
}
