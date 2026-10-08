/**
 * Helper to access INPI credentials in local tests
 * First tries environment variables, then Raycast preferences
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface TestCredentials {
  username: string;
  password: string;
  source: "env" | "raycast" | "none";
}

/**
 * Retrieves INPI credentials for local tests
 */
export function getTestCredentials(): TestCredentials {
  // 1. Priority to environment variables
  if (
    process.env.INPI_USERNAME &&
    process.env.INPI_PASSWORD &&
    process.env.INPI_USERNAME.trim() &&
    process.env.INPI_PASSWORD.trim()
  ) {
    return {
      username: process.env.INPI_USERNAME.trim(),
      password: process.env.INPI_PASSWORD.trim(),
      source: "env",
    };
  }

  // 2. Try to read Raycast preferences from the file system
  try {
    const raycastCredentials = getRaycastStoredCredentials();
    if (raycastCredentials.username && raycastCredentials.password) {
      return {
        username: raycastCredentials.username,
        password: raycastCredentials.password,
        source: "raycast",
      };
    }
  } catch (error) {
    console.warn("Could not access Raycast stored credentials:", error);
  }

  // 3. No credentials found
  return {
    username: "",
    password: "",
    source: "none",
  };
}

/**
 * Tries to read Raycast preferences stored on the system
 * Note: This approach is experimental and may not work on all systems
 */
function getRaycastStoredCredentials(): { username?: string; password?: string } {
  try {
    // Raycast stores its preferences in ~/Library/Preferences/com.raycast.macos.plist
    // We use macOS `defaults` command to read them
    const plistPath = path.join(os.homedir(), "Library", "Preferences", "com.raycast.macos.plist");

    if (!fs.existsSync(plistPath)) {
      return {};
    }

    // Try to read preferences with defaults command
    // Probable format: com.raycast.extension.{extension-name}.{preference-key}
    const extensionPrefix = "com.raycast.extension.french-company-search-inpi";

    try {
      const username = execSync(`defaults read com.raycast.macos "${extensionPrefix}.inpiUsername" 2>/dev/null`, {
        encoding: "utf8",
      }).trim();
      const password = execSync(`defaults read com.raycast.macos "${extensionPrefix}.inpiPassword" 2>/dev/null`, {
        encoding: "utf8",
      }).trim();

      if (username && password && username !== "(null)" && password !== "(null)") {
        return { username, password };
      }
    } catch {
      // Keys might not exist yet
    }

    return {};
  } catch {
    return {};
  }
}

/**
 * Displays debug information about found credentials
 */
export function debugCredentials(): void {
  const creds = getTestCredentials();

  console.log("🔍 Debug credentials:");
  console.log(`  Source: ${creds.source}`);
  console.log(`  Username: ${creds.username ? "✅ Found" : "❌ Not found"}`);
  console.log(`  Password: ${creds.password ? "✅ Found" : "❌ Not found"}`);

  if (creds.source === "none") {
    console.log("");
    console.log("💡 To provide credentials:");
    console.log("  Option 1: INPI_USERNAME=xxx INPI_PASSWORD=xxx npm test");
    console.log("  Option 2: Configure in Raycast extension preferences");
  }
}
