import * as path from "path";
import * as os from "os";

/**
 * Get the platform-specific path to the Granola configuration files
 * @param filename - The configuration filename (e.g., "supabase.json", "cache-v3.json")
 * @returns The full path to the configuration file
 */
export function getGranolaConfigPath(filename: string): string {
  const homeDirectory = os.homedir();

  if (process.platform === "win32") {
    // Windows: %APPDATA%\Granola\{filename}
    return path.join(homeDirectory, "AppData", "Roaming", "Granola", filename);
  } else {
    // macOS: ~/Library/Application Support/Granola/{filename}
    return path.join(homeDirectory, "Library", "Application Support", "Granola", filename);
  }
}

/**
 * Get the path to the Granola supabase.json file
 */
export function getSupabaseConfigPath(): string {
  return getGranolaConfigPath("supabase.json");
}

/**
 * Get the path to the Granola cache-v3.json file
 */
export function getCacheConfigPath(): string {
  return getGranolaConfigPath("cache-v3.json");
}
