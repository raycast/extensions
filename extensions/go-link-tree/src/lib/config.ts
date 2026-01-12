import { getPreferenceValues } from "@raycast/api";
import * as yaml from "js-yaml";
import * as fs from "fs";
import type { GoLinkConfig } from "../types";

interface Preferences {
  configPath: string;
}

/**
 * Gets the resolved config file path (with ~ expansion)
 */
export function getConfigPath(): string {
  const { configPath } = getPreferenceValues<Preferences>();
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  return configPath.replace(/^~/, homeDir);
}

/**
 * Validates the loaded config structure
 */
function validateConfig(config: unknown): GoLinkConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Configuration file is empty or invalid");
  }

  const cfg = config as Record<string, unknown>;

  // Check for required fields
  if (!cfg.version || typeof cfg.version !== "number") {
    throw new Error(
      "Configuration missing required 'version' field (must be a number)"
    );
  }

  if (!cfg.groups || !Array.isArray(cfg.groups)) {
    throw new Error(
      "Configuration missing required 'groups' field (must be an array)"
    );
  }

  if (cfg.groups.length === 0) {
    throw new Error("Configuration must contain at least one group");
  }

  // Validate groups structure
  for (let i = 0; i < cfg.groups.length; i++) {
    const group = cfg.groups[i] as Record<string, unknown>;
    if (!group.name || typeof group.name !== "string") {
      throw new Error(`Group ${i + 1} is missing required 'name' field`);
    }
    if (!group.title || typeof group.title !== "string") {
      throw new Error(
        `Group '${group.name}' is missing required 'title' field`
      );
    }
    if (!group.links || !Array.isArray(group.links)) {
      throw new Error(
        `Group '${group.name}' is missing required 'links' field (must be an array)`
      );
    }

    // Validate links structure
    for (let j = 0; j < group.links.length; j++) {
      const link = group.links[j] as Record<string, unknown>;
      if (!link.title || typeof link.title !== "string") {
        throw new Error(
          `Link ${j + 1} in group '${group.name}' is missing required 'title' field`
        );
      }
      if (!link.url || typeof link.url !== "string") {
        throw new Error(
          `Link '${link.title}' in group '${group.name}' is missing required 'url' field`
        );
      }
      // Basic URL validation
      try {
        new URL(link.url);
      } catch {
        throw new Error(
          `Link '${link.title}' in group '${group.name}' has invalid URL: ${link.url}`
        );
      }
    }
  }

  return config as GoLinkConfig;
}

export async function loadConfig(): Promise<GoLinkConfig> {
  const resolvedPath = getConfigPath();

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Configuration file not found: ${resolvedPath}\n\nPlease check the path in Raycast preferences or create the file.`
    );
  }

  let content: string;
  try {
    content = fs.readFileSync(resolvedPath, "utf-8");
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    throw new Error(`Failed to read configuration file: ${error}`);
  }

  if (content.trim().length === 0) {
    throw new Error("Configuration file is empty");
  }

  let parsed: unknown;
  try {
    if (resolvedPath.endsWith(".yaml") || resolvedPath.endsWith(".yml")) {
      parsed = yaml.load(content);
      if (!parsed) {
        throw new Error("YAML file appears to be empty or invalid");
      }
    } else {
      parsed = JSON.parse(content);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    const fileType =
      resolvedPath.endsWith(".yaml") || resolvedPath.endsWith(".yml")
        ? "YAML"
        : "JSON";
    throw new Error(`Failed to parse ${fileType} configuration: ${error}`);
  }

  return validateConfig(parsed);
}
