/**
 * TypeScript type definitions for Claude Plugin Manager
 */

export interface PluginInstallation {
  scope: "user" | "project" | "local";
  version: string;
  installPath: string;
  enabled?: boolean;
  projectPath?: string;
}

export interface Plugin {
  name: string;
  version: string;
  description: string;
  author?: {
    name: string;
    email?: string;
  };
  marketplace: string;
  marketplacePath?: string; // Path to plugin in marketplace cache
  components: {
    commands?: {
      count: number;
      names: string[];
    };
    skills?: {
      count: number;
      names: string[];
    };
    agents?: {
      count: number;
      names: string[];
    };
    hooks?: {
      count: number;
      names: string[];
    };
    mcp?: boolean;
  };
  // Array of all installations across different scopes
  installations: PluginInstallation[];
  // Legacy field for backwards compatibility - computed from installations
  installStatus?: {
    installed: boolean;
    scope?: "user" | "project" | "local";
    version?: string;
    installPath?: string;
    enabled?: boolean;
  };
  repositoryUrl?: string;
}

export interface Marketplace {
  name: string;
  source: {
    type: "github" | "directory" | "git" | "url";
    repo?: string; // For GitHub
    path?: string; // For directory
    url?: string; // For git/URL
  };
  installLocation: string;
  lastUpdated: string;
  pluginCount?: number;
}

export interface InstalledPlugin {
  pluginId: string; // e.g., "plugin-dev@claude-code-plugins"
  scope: "user" | "project" | "local";
  installPath: string;
  version: string;
  installedAt: string;
  lastUpdated: string;
  isLocal: boolean;
  enabled?: boolean;
  projectPath?: string; // For project/local scopes
}

export interface CLIResult {
  success: boolean;
  output: string;
  error?: string;
}

// Error types
export class ClaudeNotInstalledError extends Error {
  constructor() {
    super("Claude CLI is not installed. Please install Claude Code first.");
    this.name = "ClaudeNotInstalledError";
  }
}

export class PluginNotFoundError extends Error {
  constructor(pluginName: string) {
    super(`Plugin "${pluginName}" not found in any marketplace.`);
    this.name = "PluginNotFoundError";
  }
}

export class MarketplaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketplaceError";
  }
}

// Plugin manifest types (from .claude-plugin/plugin.json)
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: {
    name: string;
    email?: string;
  };
  repository?: {
    type: string;
    url: string;
  };
  license?: string;
  keywords?: string[];
}

// Installed plugins JSON format (from ~/.claude/plugins/installed_plugins.json)
export interface InstalledPluginsData {
  version: number;
  plugins: {
    [pluginId: string]: Array<{
      scope: "user" | "project" | "local";
      installPath: string;
      version: string;
      installedAt: string;
      lastUpdated: string;
      isLocal: boolean;
      enabled?: boolean;
      projectPath?: string; // For project/local scopes
    }>;
  };
}

// Marketplace JSON format (from ~/.claude/plugins/known_marketplaces.json)
export interface MarketplacesData {
  [name: string]: {
    source: {
      type: string;
      repo?: string;
      path?: string;
      url?: string;
    };
    installLocation: string;
    lastUpdated: string;
  };
}

// Marketplace manifest types (from <marketplace>/.claude-plugin/marketplace.json)
export interface MarketplaceManifest {
  $schema?: string;
  name: string;
  description: string;
  owner?: {
    name: string;
    email?: string;
  };
  plugins: MarketplacePluginEntry[];
}

export interface MarketplacePluginEntry {
  name: string;
  description: string;
  version?: string;
  author?: {
    name: string;
    email?: string;
  };
  source: string | PluginSource;
  category?: string;
  homepage?: string;
  tags?: string[];
  strict?: boolean;
  lspServers?: Record<string, unknown>;
}

export interface PluginSource {
  source: "url" | "github" | "git";
  url?: string;
  repo?: string;
}
