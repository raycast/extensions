/**
 * Claude CLI wrapper functions
 * Handles all interactions with the Claude Code CLI
 */

import { execSync, ExecSyncOptions } from "child_process";
import { homedir } from "os";
import path from "path";
import fs from "fs";

// Global variable for the claude command path (set from React components)
let claudeCommandPath: string | null = null;

/**
 * Initialize the Claude CLI path from preferences
 * Call this from React components with the preference value
 */
export function initClaudePath(path: string | undefined): void {
  if (path && path.trim() !== "") {
    // Expand ~ to home directory if present
    claudeCommandPath = path.trim().replace(/^~/, homedir());
  } else {
    claudeCommandPath = null;
  }
}

/**
 * Get the Claude CLI command to use.
 * Uses the path set by initClaudePath(), or falls back to 'claude' for system PATH lookup.
 */
function getClaudeCommand(): string {
  if (claudeCommandPath) {
    return claudeCommandPath;
  }
  return "claude";
}

/**
 * Common exec options with Git-friendly environment
 */
const execOptions = {
  encoding: "utf-8" as const,
  stdio: "pipe" as const,
  timeout: 120000, // 120 seconds for Git operations
  maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
  env: {
    ...process.env,
    HOME: homedir(), // Ensure Git can find .gitconfig
    GIT_TERMINAL_PROMPT: "0", // Disable Git interactive prompts
  },
};
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
} from "./types";

const CLAUDE_HOME = path.join(homedir(), ".claude");
const PLUGINS_DIR = path.join(CLAUDE_HOME, "plugins");

/**
 * Check if Claude CLI is installed
 */
export function isClaudeInstalled(): boolean {
  try {
    execSync(`${getClaudeCommand()} --version`, execOptions);
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
          scope: install.scope,
          installPath: install.installPath,
          version: install.version,
          installedAt: install.installedAt,
          lastUpdated: install.lastUpdated,
          isLocal: install.isLocal,
          enabled: install.enabled,
          projectPath: install.projectPath,
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
      skills: getSkillsFromDirectory(path.join(pluginPath, "skills")),
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
 * Parse YAML frontmatter from a markdown file
 * Returns key-value pairs from the frontmatter block, or null if no frontmatter exists
 */
function parseYamlFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      // Strip surrounding quotes from values
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  }
  return frontmatter;
}

/**
 * Extract skill name from a SKILL.md file, falling back to directory name
 */
function extractSkillName(skillMdPath: string, fallbackName: string): string {
  const content = fs.readFileSync(skillMdPath, "utf-8");
  const frontmatter = parseYamlFrontmatter(content);
  return frontmatter?.name || fallbackName;
}

/**
 * Get skills from skills directory
 * Supports both subdirectory structure (with SKILL.md) and direct .md/.sh files
 */
function getSkillsFromDirectory(dir: string): {
  count: number;
  names: string[];
} {
  if (!fs.existsSync(dir)) return { count: 0, names: [] };

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const names: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillMdPath = path.join(dir, entry.name, "SKILL.md");
        if (fs.existsSync(skillMdPath)) {
          names.push(extractSkillName(skillMdPath, entry.name));
        }
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".md") || entry.name.endsWith(".sh"))
      ) {
        names.push(entry.name.replace(/\.(md|sh)$/, ""));
      }
    }

    return { count: names.length, names };
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

        // Find ALL installations of this plugin across different scopes
        const installations = installedPlugins
          .filter((p) => p.pluginId === pluginId)
          .map((install) => ({
            scope: install.scope,
            version: install.version,
            installPath: install.installPath,
            enabled: install.enabled ?? true, // Default to true if not specified
            projectPath: install.projectPath,
          }));

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

        // Compute installStatus from installations for backwards compatibility
        const installStatus =
          installations.length > 0
            ? {
                installed: true,
                scope: installations[0].scope,
                version: installations[0].version,
                installPath: installations[0].installPath,
                enabled: installations[0].enabled,
              }
            : undefined;

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
          installations, // Array of all installations (can be empty)
          installStatus, // Computed from first installation for backwards compatibility
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
  try {
    const output = execSync(
      `${getClaudeCommand()} plugin install "${pluginName.trim()}" --scope ${scope}`,
      execOptions,
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
  projectPath?: string,
): Promise<CLIResult> {
  try {
    // For local/project scopes, use projectPath as working directory if available
    const options: ExecSyncOptions = {
      ...execOptions,
      ...((scope === "local" || scope === "project") && projectPath
        ? { cwd: projectPath }
        : {}),
    };

    const output = execSync(
      `${getClaudeCommand()} plugin uninstall "${pluginName.trim()}" --scope ${scope}`,
      options,
    ).toString();
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
  projectPath?: string,
): Promise<CLIResult> {
  try {
    // For local/project scopes, use projectPath as working directory if available
    const options: ExecSyncOptions = {
      ...execOptions,
      ...((scope === "local" || scope === "project") && projectPath
        ? { cwd: projectPath }
        : {}),
    };

    const output = execSync(
      `${getClaudeCommand()} plugin enable "${pluginName.trim()}" --scope ${scope}`,
      options,
    ).toString();
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
  projectPath?: string,
): Promise<CLIResult> {
  try {
    // For local/project scopes, use projectPath as working directory if available
    const options: ExecSyncOptions = {
      ...execOptions,
      ...((scope === "local" || scope === "project") && projectPath
        ? { cwd: projectPath }
        : {}),
    };

    const output = execSync(
      `${getClaudeCommand()} plugin disable "${pluginName.trim()}" --scope ${scope}`,
      options,
    ).toString();
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
  projectPath?: string,
): Promise<CLIResult> {
  try {
    // For local/project scopes, use projectPath as working directory if available
    const options: ExecSyncOptions = {
      ...execOptions,
      ...((scope === "local" || scope === "project") && projectPath
        ? { cwd: projectPath }
        : {}),
    };

    const output = execSync(
      `${getClaudeCommand()} plugin update "${pluginName.trim()}" --scope ${scope}`,
      options,
    ).toString();
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
 * Update a plugin across all installed scopes
 * Since all scopes share the same code, updating one updates all
 */
export async function updatePluginAllScopes(
  pluginName: string,
  installations: Array<{
    scope: "user" | "project" | "local";
    projectPath?: string;
  }>,
): Promise<CLIResult> {
  const results: string[] = [];
  const errors: string[] = [];

  for (const installation of installations) {
    try {
      // For local/project scopes, use projectPath as working directory if available
      const options: ExecSyncOptions = {
        ...execOptions,
        ...((installation.scope === "local" ||
          installation.scope === "project") &&
        installation.projectPath
          ? { cwd: installation.projectPath }
          : {}),
      };

      const output = execSync(
        `${getClaudeCommand()} plugin update "${pluginName.trim()}" --scope ${installation.scope}`,
        options,
      ).toString();
      results.push(`Updated in ${installation.scope} scope: ${output}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(
        `Failed to update in ${installation.scope} scope: ${errorMsg}`,
      );
    }
  }

  if (errors.length === installations.length) {
    // All updates failed
    return {
      success: false,
      output: results.join("\n"),
      error: errors.join("\n"),
    };
  } else if (errors.length > 0) {
    // Some updates failed
    return {
      success: true,
      output: results.join("\n") + "\n\nWarnings:\n" + errors.join("\n"),
    };
  } else {
    // All updates succeeded
    return {
      success: true,
      output: results.join("\n"),
    };
  }
}

/**
 * Uninstall a plugin from all installed scopes
 */
export async function uninstallPluginAllScopes(
  pluginName: string,
  installations: Array<{
    scope: "user" | "project" | "local";
    projectPath?: string;
  }>,
): Promise<CLIResult> {
  const results: string[] = [];
  const errors: string[] = [];

  for (const installation of installations) {
    try {
      // For local/project scopes, use projectPath as working directory if available
      const options: ExecSyncOptions = {
        ...execOptions,
        ...((installation.scope === "local" ||
          installation.scope === "project") &&
        installation.projectPath
          ? { cwd: installation.projectPath }
          : {}),
      };

      const output = execSync(
        `${getClaudeCommand()} plugin uninstall "${pluginName.trim()}" --scope ${installation.scope}`,
        options,
      ).toString();
      results.push(`Uninstalled from ${installation.scope} scope: ${output}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(
        `Failed to uninstall from ${installation.scope} scope: ${errorMsg}`,
      );
    }
  }

  if (errors.length === installations.length) {
    // All uninstalls failed
    return {
      success: false,
      output: results.join("\n"),
      error: errors.join("\n"),
    };
  } else if (errors.length > 0) {
    // Some uninstalls failed
    return {
      success: true,
      output: results.join("\n") + "\n\nWarnings:\n" + errors.join("\n"),
    };
  } else {
    // All uninstalls succeeded
    return {
      success: true,
      output: results.join("\n"),
    };
  }
}

/**
 * Add a marketplace using Claude CLI
 */
export async function addMarketplace(source: string): Promise<CLIResult> {
  try {
    const output = execSync(
      `${getClaudeCommand()} plugin marketplace add "${source.trim()}"`,
      execOptions,
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
  try {
    const output = execSync(
      `${getClaudeCommand()} plugin marketplace remove "${name.trim()}"`,
      execOptions,
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
  try {
    const cmd = name
      ? `${getClaudeCommand()} plugin marketplace update "${name.trim()}"`
      : `${getClaudeCommand()} plugin marketplace update`;
    const output = execSync(cmd, execOptions);
    return { success: true, output: output.toString() };
  } catch (error: unknown) {
    // Extract detailed error info from execSync error
    const execError = error as {
      message?: string;
      stderr?: Buffer | string;
      stdout?: Buffer | string;
      status?: number;
    };
    const stderr = execError.stderr?.toString() || "";
    const stdout = execError.stdout?.toString() || "";
    const fullError = [
      execError.message || String(error),
      stderr && `stderr: ${stderr}`,
      stdout && `stdout: ${stdout}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      success: false,
      output: stdout,
      error: fullError,
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
