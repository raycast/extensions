import * as path from "path";
import * as os from "os";

/**
 * Get the platform-specific path to the Granola configuration files
 * @param filename - The configuration filename (e.g., "supabase.json", "cache-v3.json")
 * @returns The full path to the configuration file
 */
export function getGranolaConfigPath(filename: string): string {
  const homeDirectory = os.homedir();
  let configPath: string;

  if (process.platform === "win32") {
    // Windows: %APPDATA%\Granola\{filename}
    configPath = path.join(process.env.APPDATA || path.join(homeDirectory, "AppData", "Roaming"), "Granola", filename);
  } else {
    // macOS: ~/Library/Application Support/Granola/{filename}
    configPath = path.join(homeDirectory, "Library", "Application Support", "Granola", filename);
  }

  return configPath;
}

export function getSupabaseConfigPath(): string {
  return getGranolaConfigPath("supabase.json");
}

export function getStoredAccountsPath(): string {
  return getGranolaConfigPath("stored-accounts.json");
}
