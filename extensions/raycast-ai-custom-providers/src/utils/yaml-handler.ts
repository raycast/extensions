import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";
import { getPreferenceValues } from "@raycast/api";
import { Provider } from "../types";

export const PROVIDERS_FILE_PATH = path.join(process.env.HOME || "", ".config", "raycast", "ai", "providers.yaml");

/**
 * Reads and parses the providers.yaml file
 * @returns Array of providers
 */
export function readProvidersFile(): Provider[] {
  if (!fs.existsSync(PROVIDERS_FILE_PATH)) {
    return [];
  }

  const fileContent = fs.readFileSync(PROVIDERS_FILE_PATH, "utf-8");
  const data = YAML.parse(fileContent);

  if (data && Array.isArray(data.providers)) {
    return data.providers.filter((p: Provider) => p && p.id);
  }

  return [];
}

/**
 * Creates a backup of the YAML file if it exists
 * @param filePath Path to the YAML file
 */
function createBackupFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const backupPath = `${filePath}.backup`;
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    fs.writeFileSync(backupPath, fileContent, "utf-8");
  } catch (error) {
    console.error(`Failed to create backup file: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Writes providers to the YAML file, completely overwriting the file
 * @param providers Array of providers to write
 */
export function writeProvidersFile(providers: Provider[]): void {
  // Check preference for creating backup
  const preferences = getPreferenceValues<{ createBackup?: boolean }>();
  const shouldCreateBackup = preferences.createBackup !== false; // Default to true if not set

  // Create backup if preference is enabled
  if (shouldCreateBackup) {
    createBackupFile(PROVIDERS_FILE_PATH);
  }

  // Ensure directory exists
  const dir = path.dirname(PROVIDERS_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const yamlData = {
    providers: providers,
  };

  const yamlContent = YAML.stringify(yamlData, {
    indent: 2,
    lineWidth: 0,
    simpleKeys: false,
  });

  fs.writeFileSync(PROVIDERS_FILE_PATH, yamlContent, "utf-8");
}
