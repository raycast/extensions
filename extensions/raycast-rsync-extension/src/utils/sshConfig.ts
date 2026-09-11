import { SSHHostConfig } from "../types/server";
import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";

// Cache for parsed SSH config
interface CacheEntry {
  hosts: SSHHostConfig[];
  mtimeMs: number;
}

let configCache: CacheEntry | null = null;

/**
 * Get the absolute path to the SSH config file
 * @returns The path to ~/.ssh/config
 */
export function getSSHConfigPath(): string {
  return path.join(os.homedir(), ".ssh", "config");
}

/**
 * Clear the SSH config cache
 */
export function clearCache(): void {
  configCache = null;
}

/**
 * Parse SSH config content string and extract host configurations
 * @param content The SSH config file content
 * @returns Array of SSHHostConfig objects (one per host alias)
 */
export function parseConfigContent(content: string): SSHHostConfig[] {
  const hosts: SSHHostConfig[] = [];
  const lines = content.split("\n");

  let currentHosts: string[] = [];
  let currentConfig: Partial<SSHHostConfig> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    // Check if this is a Host line
    const hostMatch = trimmedLine.match(/^Host\s+(.+)$/i);
    if (hostMatch) {
      // Save previous host config if exists
      if (currentHosts.length > 0) {
        saveHostConfigs(hosts, currentHosts, currentConfig);
      }

      // Parse new host aliases (space-separated)
      const aliases = hostMatch[1].split(/\s+/).filter((alias) => alias.trim());

      // Filter out wildcard hosts
      currentHosts = aliases.filter(
        (alias) => alias !== "*" && !alias.includes("*"),
      );
      currentConfig = {};
      continue;
    }

    // Parse host properties (indented lines)
    if (currentHosts.length > 0) {
      const propertyMatch = trimmedLine.match(/^(\w+)\s+(.+)$/);
      if (propertyMatch) {
        const [, key, value] = propertyMatch;
        const lowerKey = key.toLowerCase();

        try {
          switch (lowerKey) {
            case "hostname": {
              currentConfig.hostName = value.trim();
              break;
            }
            case "user": {
              currentConfig.user = value.trim();
              break;
            }
            case "port": {
              const portNum = parseInt(value.trim(), 10);
              if (!isNaN(portNum)) {
                currentConfig.port = portNum;
              } else {
                console.warn(`Invalid port value on line ${i + 1}: ${value}`);
              }
              break;
            }
            case "identityfile": {
              // Expand ~ in paths
              let identityPath = value.trim();
              if (identityPath.startsWith("~")) {
                identityPath = path.join(
                  os.homedir(),
                  identityPath.substring(1),
                );
              }
              currentConfig.identityFile = identityPath;
              break;
            }
            case "proxyjump": {
              currentConfig.proxyJump = value.trim();
              break;
            }
          }
        } catch (error) {
          // Log malformed entry but continue parsing
          console.warn(`Skipping malformed entry on line ${i + 1}:`, error);
        }
      }
    }
  }

  // Save the last host config
  if (currentHosts.length > 0) {
    saveHostConfigs(hosts, currentHosts, currentConfig);
  }

  return hosts;
}

/**
 * Parse the SSH config file and extract host configurations
 * Uses caching based on file modification time
 * @returns Array of SSHHostConfig objects (one per host alias), or empty array if file doesn't exist or cannot be read
 */
export function parseSSHConfig(): SSHHostConfig[] {
  const configPath = getSSHConfigPath();

  // Check if file exists
  if (!fs.existsSync(configPath)) {
    return [];
  }

  try {
    // Check file modification time for cache invalidation
    const stats = fs.statSync(configPath);
    const mtimeMs = stats.mtimeMs;

    // Return cached result if cache is valid
    if (configCache && configCache.mtimeMs === mtimeMs) {
      return configCache.hosts;
    }

    // Read the config file
    const content = fs.readFileSync(configPath, "utf-8");

    // Parse the content
    const hosts = parseConfigContent(content);

    // Update cache
    configCache = {
      hosts,
      mtimeMs,
    };

    return hosts;
  } catch (error) {
    // Handle read errors gracefully - return empty array
    const nodeError = error as NodeJS.ErrnoException;
    console.error("Error reading SSH config file:", {
      code: nodeError.code,
      message: nodeError.message,
      path: configPath,
    });
    return [];
  }
}

/**
 * Helper function to save host configurations
 * Creates one SSHHostConfig object per host alias
 */
function saveHostConfigs(
  hosts: SSHHostConfig[],
  aliases: string[],
  config: Partial<SSHHostConfig>,
): void {
  for (const alias of aliases) {
    hosts.push({
      host: alias,
      hostName: config.hostName,
      user: config.user,
      port: config.port,
      identityFile: config.identityFile,
      proxyJump: config.proxyJump,
    });
  }
}

/**
 * Find a specific host configuration by alias
 * @param alias The host alias to search for
 * @returns The SSHHostConfig object or null if not found
 */
export function getHostConfig(alias: string): SSHHostConfig | null {
  try {
    const hosts = parseSSHConfig();
    return hosts.find((host) => host.host === alias) || null;
  } catch (error) {
    // Log error for debugging
    console.error("Error getting host config:", error);
    // Return null if config cannot be parsed
    return null;
  }
}
