import { homedir } from "os";
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { parse } from "yaml";
import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "./types";

/**
 * Get extension preferences
 */
export function getExtensionPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

/**
 * Get Clash Verge Rev configuration file paths
 */
export function getConfigPaths() {
  const homeDir = homedir();
  let configDir: string;

  // Determine configuration directory based on operating system
  if (process.platform === "darwin") {
    // macOS
    configDir = join(
      homeDir,
      "Library",
      "Application Support",
      "io.github.clash-verge-rev.clash-verge-rev",
    );
  } else if (process.platform === "win32") {
    // Windows
    const appData = process.env.APPDATA || join(homeDir, "AppData", "Roaming");
    configDir = join(appData, "io.github.clash-verge-rev.clash-verge-rev");
  } else {
    // Linux
    const configHome = process.env.XDG_CONFIG_HOME || join(homeDir, ".config");
    configDir = join(configHome, "io.github.clash-verge-rev.clash-verge-rev");
  }

  return {
    vergeConfigPath: join(configDir, "verge.yaml"),
    clashConfigPath: join(configDir, "config.yaml"),
    profilesDir: join(configDir, "profiles"),
  };
}

/**
 * Read Verge configuration file
 */
export function readVergeConfig() {
  try {
    const { vergeConfigPath } = getConfigPaths();

    if (!existsSync(vergeConfigPath)) {
      console.warn("Verge configuration file does not exist:", vergeConfigPath);
      return null;
    }

    const content = readFileSync(vergeConfigPath, "utf-8");
    const config = parse(content);

    return config;
  } catch (error) {
    console.error("Failed to read Verge configuration file:", error);
    return null;
  }
}

/**
 * Read Clash configuration file
 */
export function readClashConfig() {
  try {
    const { clashConfigPath } = getConfigPaths();

    if (!existsSync(clashConfigPath)) {
      console.warn("Clash configuration file does not exist:", clashConfigPath);
      return null;
    }

    const content = readFileSync(clashConfigPath, "utf-8");
    const config = parse(content);

    return config;
  } catch (error) {
    console.error("Failed to read Clash configuration file:", error);
    return null;
  }
}

/**
 * Get Clash API configuration information
 */
export function getClashApiConfig(): { url: string; secret?: string } {
  const preferences = getExtensionPreferences();

  // Prioritize user-configured API address
  if (preferences.clashApiUrl && preferences.clashApiUrl.trim()) {
    return {
      url: preferences.clashApiUrl.trim(),
      secret: preferences.clashSecret?.trim() || undefined,
    };
  }

  // Try to read from configuration file
  try {
    const clashConfig = readClashConfig();
    if (clashConfig) {
      const externalController = clashConfig["external-controller"];
      const secret = clashConfig.secret;

      if (externalController) {
        let url = externalController;

        // Handle different formats of external-controller
        if (url.startsWith(":")) {
          // Format: :9090
          url = `127.0.0.1${url}`;
        } else if (/^\d+$/.test(url)) {
          // Format: 9090
          url = `127.0.0.1:${url}`;
        }

        // Ensure protocol prefix
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = `http://${url}`;
        }

        return {
          url,
          secret: preferences.clashSecret?.trim() || secret || undefined,
        };
      }
    }
  } catch (error) {
    console.error(
      "Failed to get API information from configuration file:",
      error,
    );
  }

  // Use default configuration
  return {
    url: "http://127.0.0.1:9097",
    secret: preferences.clashSecret?.trim() || undefined,
  };
}

/**
 * Check if auto close connections is enabled
 */
export function isAutoCloseConnectionEnabled(): boolean {
  const preferences = getExtensionPreferences();

  // Prioritize extension settings
  if (preferences.autoCloseConnections !== undefined) {
    return preferences.autoCloseConnections;
  }

  // Try to read from Verge configuration
  try {
    const vergeConfig = readVergeConfig();
    return vergeConfig?.auto_close_connection || false;
  } catch (error) {
    console.error("Failed to check auto close connection settings:", error);
    return false;
  }
}
