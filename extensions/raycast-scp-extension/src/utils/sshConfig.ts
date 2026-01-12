import { SSHHostConfig } from "../types/server";
import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Get the absolute path to the SSH config file
 * @returns The path to ~/.ssh/config
 */
export function getSSHConfigPath(): string {
  return path.join(os.homedir(), ".ssh", "config");
}

/**
 * Parse the SSH config file and extract host configurations
 * @returns Array of SSHHostConfig objects (one per host alias)
 * @throws Error if config file cannot be read
 */
export function parseSSHConfig(): SSHHostConfig[] {
  const configPath = getSSHConfigPath();

  // Check if file exists
  if (!fs.existsSync(configPath)) {
    console.error("SSH config file not found:", configPath);
    throw new Error(`SSH config file not found at ${configPath}`);
  }

  // Read the config file
  let content: string;
  try {
    content = fs.readFileSync(configPath, "utf-8");
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    console.error("Error reading SSH config file:", {
      code: nodeError.code,
      message: nodeError.message,
      path: configPath,
    });

    if (nodeError.code === "EACCES") {
      throw new Error("Cannot read SSH config file: permission denied");
    }
    if (nodeError.code === "EISDIR") {
      throw new Error("SSH config path is a directory, not a file");
    }
    throw new Error(`Failed to read SSH config file: ${nodeError.message}`);
  }

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
