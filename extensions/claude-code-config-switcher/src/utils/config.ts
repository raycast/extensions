import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { ClaudeCodeConfig } from "../types";

/**
 * Expands ~ to home directory in file paths
 */
export function expandPath(filePath: string): string {
  if (filePath.startsWith("~/")) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

/**
 * Get the default Claude Code config file path
 */
export function getDefaultConfigPath(): string {
  return path.join(os.homedir(), ".claude", "settings.json");
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure directory exists, create if it doesn't
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

/**
 * Read Claude Code configuration file
 */
export async function readClaudeConfig(configPath?: string): Promise<ClaudeCodeConfig> {
  const filePath = expandPath(configPath || getDefaultConfigPath());

  try {
    const exists = await fileExists(filePath);
    if (!exists) {
      return {};
    }

    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as ClaudeCodeConfig;
  } catch (error) {
    throw new Error(`Failed to read config from ${filePath}: ${(error as Error).message}`);
  }
}

/**
 * Write Claude Code configuration file
 */
export async function writeClaudeConfig(config: ClaudeCodeConfig, configPath?: string): Promise<void> {
  const filePath = expandPath(configPath || getDefaultConfigPath());
  const dirPath = path.dirname(filePath);

  try {
    // Ensure directory exists
    await ensureDir(dirPath);

    // Write config file with pretty formatting
    await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    throw new Error(`Failed to write config to ${filePath}: ${(error as Error).message}`);
  }
}

/**
 * Backup current configuration file
 */
export async function backupClaudeConfig(configPath?: string): Promise<string> {
  const filePath = expandPath(configPath || getDefaultConfigPath());
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${filePath}.backup-${timestamp}`;

  try {
    const exists = await fileExists(filePath);
    if (!exists) {
      throw new Error(`Config file does not exist: ${filePath}`);
    }

    await fs.copyFile(filePath, backupPath);
    return backupPath;
  } catch (error) {
    throw new Error(`Failed to backup config: ${(error as Error).message}`);
  }
}

/**
 * Merge configurations (deep merge for objects)
 */
export function mergeConfigs(base: ClaudeCodeConfig, override: ClaudeCodeConfig): ClaudeCodeConfig {
  const result: ClaudeCodeConfig = { ...base };

  for (const key in override) {
    const value = override[key];
    if (value !== undefined && value !== null) {
      if (typeof value === "object" && !Array.isArray(value) && typeof base[key] === "object") {
        result[key] = { ...base[key], ...value };
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Validate configuration structure
 */
export function validateConfig(config: unknown): config is ClaudeCodeConfig {
  if (!config || typeof config !== "object") {
    return false;
  }

  // Basic validation - config can have various properties
  // We're mainly checking it's a valid object
  return true;
}

/**
 * Get multiple config file paths (user, project, local)
 */
export function getAllConfigPaths(projectPath?: string): string[] {
  const paths: string[] = [getDefaultConfigPath()];

  if (projectPath) {
    paths.push(path.join(projectPath, ".claude", "settings.json"));
    paths.push(path.join(projectPath, ".claude", "settings.local.json"));
  }

  return paths;
}
