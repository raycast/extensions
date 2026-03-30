import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  InstalledPluginsFile,
  PluginInstallation,
  PluginMetadata,
  MarketplaceInfo,
  BlocklistEntry,
  PluginContents,
  PluginInfo,
} from "../types";
import { readJsonFile, buildClaudeEnv } from "./fs-utils";

const execFileAsync = promisify(execFile);

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const INSTALLED_PLUGINS_PATH = path.join(
  CLAUDE_DIR,
  "plugins",
  "installed_plugins.json",
);
const SETTINGS_PATH = path.join(CLAUDE_DIR, "settings.json");
const BLOCKLIST_PATH = path.join(CLAUDE_DIR, "plugins", "blocklist.json");
const KNOWN_MARKETPLACES_PATH = path.join(
  CLAUDE_DIR,
  "plugins",
  "known_marketplaces.json",
);

function readInstalledPlugins(): Record<string, PluginInstallation[]> {
  const data = readJsonFile<InstalledPluginsFile>(INSTALLED_PLUGINS_PATH);
  return data?.plugins ?? {};
}

function readEnabledPlugins(): Record<string, boolean> {
  const settings = readJsonFile<Record<string, unknown>>(SETTINGS_PATH);
  return (settings?.enabledPlugins as Record<string, boolean>) ?? {};
}

function readBlocklist(): BlocklistEntry[] {
  const data = readJsonFile<{ plugins: BlocklistEntry[] }>(BLOCKLIST_PATH);
  return data?.plugins ?? [];
}

function readKnownMarketplaces(): Record<string, MarketplaceInfo> {
  return (
    readJsonFile<Record<string, MarketplaceInfo>>(KNOWN_MARKETPLACES_PATH) ?? {}
  );
}

function readPluginMetadata(installPath: string): PluginMetadata | null {
  const pluginJsonPath = path.join(
    installPath,
    ".claude-plugin",
    "plugin.json",
  );
  return readJsonFile<PluginMetadata>(pluginJsonPath);
}

function scanPluginContents(installPath: string): PluginContents | null {
  try {
    const commands: string[] = [];
    const skills: string[] = [];
    const agents: string[] = [];
    const mcpServers: string[] = [];

    const commandsDir = path.join(installPath, "commands");
    if (fs.existsSync(commandsDir) && fs.statSync(commandsDir).isDirectory()) {
      for (const f of fs.readdirSync(commandsDir)) {
        if (f.endsWith(".md")) commands.push(f.replace(/\.md$/, ""));
      }
    }

    const skillsDir = path.join(installPath, "skills");
    if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
      for (const f of fs.readdirSync(skillsDir)) {
        const skillPath = path.join(skillsDir, f);
        const stat = fs.statSync(skillPath);
        if (stat.isDirectory()) {
          skills.push(f);
        } else if (f.endsWith(".md")) {
          skills.push(f.replace(/\.md$/, ""));
        }
      }
    }

    const agentsDir = path.join(installPath, "agents");
    if (fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory()) {
      for (const f of fs.readdirSync(agentsDir)) {
        if (f.endsWith(".md")) agents.push(f.replace(/\.md$/, ""));
      }
    }

    const mcpJsonPath = path.join(installPath, ".mcp.json");
    if (fs.existsSync(mcpJsonPath)) {
      const mcpData = readJsonFile<Record<string, unknown>>(mcpJsonPath);
      if (mcpData) {
        const servers =
          (mcpData.mcpServers as Record<string, unknown>) ?? mcpData;
        for (const key of Object.keys(servers)) {
          if (key !== "mcpServers") mcpServers.push(key);
        }
      }
    }

    const hasReadme = fs.existsSync(path.join(installPath, "README.md"));

    return { commands, skills, agents, mcpServers, hasReadme };
  } catch {
    return null;
  }
}

function parsePluginKey(key: string): { name: string; marketplaceId: string } {
  const atIndex = key.lastIndexOf("@");
  if (atIndex <= 0) return { name: key, marketplaceId: "" };
  return { name: key.slice(0, atIndex), marketplaceId: key.slice(atIndex + 1) };
}

export async function loadAllPlugins(): Promise<PluginInfo[]> {
  const installed = readInstalledPlugins();
  const enabledMap = readEnabledPlugins();
  const blocklist = readBlocklist();
  const marketplaces = readKnownMarketplaces();

  const blocklistMap = new Map<string, BlocklistEntry>();
  for (const entry of blocklist) {
    blocklistMap.set(entry.plugin, entry);
  }

  const plugins: PluginInfo[] = [];

  for (const [key, installations] of Object.entries(installed)) {
    if (!installations || installations.length === 0) continue;

    const installation = installations[0];
    const { name, marketplaceId } = parsePluginKey(key);
    const installPathExists = fs.existsSync(installation.installPath);

    const metadata = installPathExists
      ? readPluginMetadata(installation.installPath)
      : null;

    const contents = installPathExists
      ? scanPluginContents(installation.installPath)
      : null;

    plugins.push({
      key,
      name,
      marketplaceId,
      enabled: enabledMap[key] ?? false,
      installation,
      metadata,
      marketplace: marketplaces[marketplaceId] ?? null,
      blocklist: blocklistMap.get(key) ?? null,
      contents,
      installPathExists,
    });
  }

  plugins.sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return plugins;
}

// ===== Plugin operations via Claude CLI =====

async function runClaudePlugin(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("claude", ["plugin", ...args], {
    timeout: 30000,
    env: buildClaudeEnv(),
  });
  return stdout.trim();
}

export async function enablePlugin(pluginKey: string): Promise<void> {
  await runClaudePlugin("enable", pluginKey);
}

export async function disablePlugin(pluginKey: string): Promise<void> {
  await runClaudePlugin("disable", pluginKey);
}

export async function uninstallPlugin(pluginKey: string): Promise<void> {
  await runClaudePlugin("uninstall", pluginKey);
}

export async function updatePlugin(pluginKey: string): Promise<string> {
  // Claude CLI doesn't pull the marketplace repo before checking versions,
  // so we pull it manually to ensure we compare against the latest remote.
  const marketplaceId = pluginKey.split("@")[1];
  if (marketplaceId) {
    await pullMarketplace(marketplaceId);
  }
  const output = await runClaudePlugin("update", pluginKey);
  return output;
}

async function pullMarketplace(marketplaceId: string): Promise<void> {
  const marketplaces =
    readJsonFile<Record<string, MarketplaceInfo>>(KNOWN_MARKETPLACES_PATH) ??
    {};
  const info = marketplaces[marketplaceId];
  if (!info?.installLocation) return;

  // Only pull git-based marketplaces (some like claude-plugins-official use GCS)
  const gitDir = path.join(info.installLocation, ".git");
  if (!fs.existsSync(gitDir)) return;

  try {
    await execFileAsync("git", ["pull"], {
      cwd: info.installLocation,
      timeout: 15000,
      env: buildClaudeEnv(),
    });
  } catch {
    // Pull failed (offline, no remote, etc.) — proceed with cached version
  }
}
