/**
 * Claude CLI wrapper functions
 * Handles all interactions with the Claude Code CLI
 */

import { execSync } from "child_process";
import { homedir } from "os";
import path from "path";
import fs from "fs";
import {
  Plugin,
  Marketplace,
  InstalledPlugin,
  CLIResult,
  PluginManifest,
  InstalledPluginsData,
  MarketplacesData,
  MarketplaceManifest,
  MarketplacePluginEntry,
  ClaudeNotInstalledError,
} from "./types";

const CLAUDE_HOME = path.join(homedir(), ".claude");
const PLUGINS_DIR = path.join(CLAUDE_HOME, "plugins");

// Common paths where Claude CLI might be installed
const CLAUDE_PATHS = [
  "claude", // In PATH
  path.join(homedir(), ".local/bin/claude"), // pipx default
  "/usr/local/bin/claude", // Homebrew
  "/opt/homebrew/bin/claude", // Homebrew on Apple Silicon
  path.join(homedir(), ".npm-global/bin/claude"), // npm global
  path.join(homedir(), ".nvm/versions/node/*/bin/claude"), // nvm
];

/**
 * Find Claude CLI executable path
 */
function findClaudePath(): string | null {
  // Try each possible path
  for (const claudePath of CLAUDE_PATHS) {
    try {
      // Skip paths with wildcards for now
      if (claudePath.includes("*")) continue;

      // Try to execute --version to verify it works
      execSync(`"${claudePath}" --version`, {
        encoding: "utf-8",
        stdio: "pipe",
      });
      return claudePath.trim();
    } catch {
      // Continue to next path
      continue;
    }
  }

  // Try using 'which' as fallback
  try {
    const result = execSync("which claude", {
      encoding: "utf-8",
      stdio: "pipe",
    });
    return result.trim();
  } catch {
    return null;
  }
}

// Cache the Claude path to avoid repeated lookups
let cachedClaudePath: string | null | undefined = undefined;

/**
 * Get Claude CLI path (with caching)
 */
function getClaudePath(): string {
  if (cachedClaudePath === undefined) {
    cachedClaudePath = findClaudePath();
  }

  if (!cachedClaudePath) {
    throw new ClaudeNotInstalledError();
  }

  return cachedClaudePath;
}

/**
 * Check if Claude CLI is installed
 */
export function isClaudeInstalled(): boolean {
  try {
    getClaudePath();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all installed plugins by reading installed_plugins.json
 */
export async function getInstalledPlugins(): Promise<InstalledPlugin[]> {
  const filePath = path.join(PLUGINS_DIR, "installed_plugins.json");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data: InstalledPluginsData = JSON.parse(content);

    const plugins: InstalledPlugin[] = [];
    for (const [pluginId, installations] of Object.entries(data.plugins)) {
      for (const install of installations) {
        plugins.push({
          pluginId,
          ...install,
        });
      }
    }
    return plugins;
  } catch (error) {
    console.error("Failed to read installed plugins:", error);
    return [];
  }
}

/**
 * Get all marketplaces by reading known_marketplaces.json
 */
export async function getMarketplaces(): Promise<Marketplace[]> {
  const filePath = path.join(PLUGINS_DIR, "known_marketplaces.json");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data: MarketplacesData = JSON.parse(content);

    return Object.entries(data).map(([name, info]) => ({
      name,
      source: info.source as Marketplace["source"],
      installLocation: info.installLocation,
      lastUpdated: info.lastUpdated,
    }));
  } catch (error) {
    console.error("Failed to read marketplaces:", error);
    return [];
  }
}

/**
 * Parse plugin metadata from plugin directory
 */
async function parsePluginMetadata(
  pluginPath: string,
): Promise<Partial<Plugin> | null> {
  try {
    // Try to read .claude-plugin/plugin.json
    const manifestPath = path.join(pluginPath, ".claude-plugin", "plugin.json");

    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    const manifest: PluginManifest = JSON.parse(
      fs.readFileSync(manifestPath, "utf-8"),
    );

    // Get components with names
    const components = {
      commands: getComponentFiles(path.join(pluginPath, "commands")),
      skills: getComponentFiles(path.join(pluginPath, "skills")),
      agents: getComponentFiles(path.join(pluginPath, "agents")),
      hooks: getHooks(pluginPath),
      mcp: fs.existsSync(path.join(pluginPath, ".mcp.json")),
    };

    // Extract repository URL
    let repositoryUrl: string | undefined;
    if (manifest.repository?.url) {
      repositoryUrl = manifest.repository.url
        .replace(/^git\+/, "")
        .replace(/\.git$/, "");
    }

    return {
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      components,
      repositoryUrl,
    };
  } catch (error) {
    console.error(`Failed to parse plugin metadata at ${pluginPath}:`, error);
    return null;
  }
}

/**
 * Get files in a directory (commands, skills, agents)
 */
function getComponentFiles(dir: string): { count: number; names: string[] } {
  if (!fs.existsSync(dir)) return { count: 0, names: [] };
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md") || f.endsWith(".sh"))
      .map((f) => f.replace(/\.(md|sh)$/, ""));
    return { count: files.length, names: files };
  } catch {
    return { count: 0, names: [] };
  }
}

/**
 * Get hooks from hooks.json
 */
function getHooks(pluginPath: string): { count: number; names: string[] } {
  const hooksPath = path.join(pluginPath, "hooks", "hooks.json");
  if (!fs.existsSync(hooksPath)) return { count: 0, names: [] };
  try {
    const hooksData = JSON.parse(fs.readFileSync(hooksPath, "utf-8"));
    const hookNames = Object.keys(hooksData);
    return { count: hookNames.length, names: hookNames };
  } catch {
    return { count: 0, names: [] };
  }
}

/**
 * Read marketplace manifest (marketplace.json)
 */
async function readMarketplaceManifest(
  marketplacePath: string,
): Promise<MarketplaceManifest | null> {
  const manifestPath = path.join(
    marketplacePath,
    ".claude-plugin",
    "marketplace.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(manifestPath, "utf-8");
    return JSON.parse(content) as MarketplaceManifest;
  } catch (error) {
    console.error(
      `Failed to read marketplace manifest at ${manifestPath}:`,
      error,
    );
    return null;
  }
}

/**
 * Resolve plugin path from marketplace entry source
 */
function resolvePluginPath(
  marketplacePath: string,
  entry: MarketplacePluginEntry,
): string | null {
  // Handle string source (local path)
  if (typeof entry.source === "string") {
    const pluginPath = path.join(marketplacePath, entry.source);
    if (fs.existsSync(pluginPath)) {
      return pluginPath;
    }
  }
  // External sources (url, github, git) don't have local paths yet
  return null;
}

/**
 * Get all available plugins from all marketplaces
 * Reads marketplace.json files as the single source of truth
 */
export async function getAllAvailablePlugins(): Promise<Plugin[]> {
  const marketplaces = await getMarketplaces();
  const installedPlugins = await getInstalledPlugins();

  const allPlugins: Plugin[] = [];

  for (const marketplace of marketplaces) {
    try {
      // Read marketplace.json - this is the only source of truth
      const manifest = await readMarketplaceManifest(
        marketplace.installLocation,
      );

      if (!manifest || !manifest.plugins) {
        console.warn(
          `Marketplace ${marketplace.name} has no marketplace.json file - skipping`,
        );
        continue;
      }

      // Process each plugin from the manifest
      for (const entry of manifest.plugins) {
        const pluginId = `${entry.name.trim()}@${marketplace.name.trim()}`;
        const installed = installedPlugins.find((p) => p.pluginId === pluginId);

        // Try to resolve local plugin path for additional metadata
        const pluginPath = resolvePluginPath(
          marketplace.installLocation,
          entry,
        );

        // If plugin has a local path, read detailed metadata (components, etc.)
        let detailedMetadata: Partial<Plugin> | null = null;
        if (pluginPath) {
          detailedMetadata = await parsePluginMetadata(pluginPath);
        }

        // Build plugin object - marketplace.json is authoritative for basic info
        const plugin: Plugin = {
          name: entry.name,
          version: entry.version || detailedMetadata?.version || "unknown",
          description: entry.description || detailedMetadata?.description || "",
          author: entry.author || detailedMetadata?.author,
          marketplace: marketplace.name,
          marketplacePath: pluginPath || undefined,
          components: detailedMetadata?.components || {},
          repositoryUrl: entry.homepage || detailedMetadata?.repositoryUrl,
          installStatus: installed
            ? {
                installed: true,
                scope: installed.scope,
                version: installed.version,
                installPath: installed.installPath,
                enabled: installed.enabled,
              }
            : {
                installed: false,
              },
        };

        allPlugins.push(plugin);
      }
    } catch (error) {
      console.error(
        `Failed to read plugins from marketplace ${marketplace.name}:`,
        error,
      );
    }
  }

  return allPlugins;
}

/**
 * Install a plugin using Claude CLI
 */
export async function installPlugin(
  pluginName: string,
  scope: "user" | "project" | "local" = "user",
): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(
      `"${claudePath.trim()}" plugin install "${pluginName.trim()}" --scope ${scope}`,
      {
        encoding: "utf-8",
        stdio: "pipe",
      },
    );
    return { success: true, output };
  } catch (error: unknown) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Uninstall a plugin using Claude CLI
 */
export async function uninstallPlugin(
  pluginName: string,
  scope: "user" | "project" | "local" = "user",
): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(
      `"${claudePath.trim()}" plugin uninstall "${pluginName.trim()}" --scope ${scope}`,
      {
        encoding: "utf-8",
        stdio: "pipe",
      },
    );
    return { success: true, output };
  } catch (error: unknown) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Enable a plugin using Claude CLI
 */
export async function enablePlugin(
  pluginName: string,
  scope: "user" | "project" | "local" = "user",
): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(
      `"${claudePath.trim()}" plugin enable "${pluginName.trim()}" --scope ${scope}`,
      {
        encoding: "utf-8",
        stdio: "pipe",
      },
    );
    return { success: true, output };
  } catch (error: unknown) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Disable a plugin using Claude CLI
 */
export async function disablePlugin(
  pluginName: string,
  scope: "user" | "project" | "local" = "user",
): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(
      `"${claudePath.trim()}" plugin disable "${pluginName.trim()}" --scope ${scope}`,
      {
        encoding: "utf-8",
        stdio: "pipe",
      },
    );
    return { success: true, output };
  } catch (error: unknown) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update a plugin using Claude CLI
 */
export async function updatePlugin(
  pluginName: string,
  scope: "user" | "project" | "local" = "user",
): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(
      `"${claudePath.trim()}" plugin update "${pluginName.trim()}" --scope ${scope}`,
      {
        encoding: "utf-8",
        stdio: "pipe",
      },
    );
    return { success: true, output };
  } catch (error: unknown) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Add a marketplace using Claude CLI
 */
export async function addMarketplace(source: string): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(
      `"${claudePath.trim()}" plugin marketplace add "${source.trim()}"`,
      {
        encoding: "utf-8",
        stdio: "pipe",
      },
    );
    return { success: true, output };
  } catch (error: unknown) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Remove a marketplace using Claude CLI
 */
export async function removeMarketplace(name: string): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const output = execSync(
      `"${claudePath.trim()}" plugin marketplace remove "${name.trim()}"`,
      {
        encoding: "utf-8",
        stdio: "pipe",
      },
    );
    return { success: true, output };
  } catch (error: unknown) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update a marketplace using Claude CLI
 */
export async function updateMarketplace(name?: string): Promise<CLIResult> {
  const claudePath = getClaudePath();

  try {
    const cmd = name
      ? `"${claudePath.trim()}" plugin marketplace update "${name.trim()}"`
      : `"${claudePath.trim()}" plugin marketplace update`;
    const output = execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
    return { success: true, output };
  } catch (error: unknown) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Open a path in Finder (macOS)
 */
export async function openInFinder(filePath: string): Promise<void> {
  execSync(`open "${filePath}"`);
}

/**
 * Open a path in VS Code
 */
export async function openInVSCode(filePath: string): Promise<void> {
  try {
    execSync(`code "${filePath}"`);
  } catch {
    // Fallback to opening in Finder if VS Code is not installed
    await openInFinder(filePath);
  }
}
