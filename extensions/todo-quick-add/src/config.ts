/**
 * Firebase configuration
 * Reads config shared by the iOS/macOS app
 */

import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  appId: string;
}

const SHARED_CONFIG_PATH = join(homedir(), "Library", "Application Support", "to-do", "firebase-config.json");

/**
 * Try to read Firebase config shared by the iOS/macOS app
 */
function readSharedConfig(): FirebaseConfig | null {
  if (!existsSync(SHARED_CONFIG_PATH)) {
    console.log("Firebase config not found at:", SHARED_CONFIG_PATH);
    return null;
  }

  try {
    const data = readFileSync(SHARED_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(data) as { apiKey: string; projectId: string; appId: string; timestamp: number };

    if (!parsed.apiKey || !parsed.projectId || !parsed.appId) {
      console.log("Invalid Firebase config format");
      return null;
    }

    return {
      apiKey: parsed.apiKey,
      projectId: parsed.projectId,
      appId: parsed.appId,
    };
  } catch (error) {
    console.error("Error reading Firebase config:", error);
    return null;
  }
}

/**
 * Get Firebase configuration
 * Reads config shared by the iOS/macOS app
 */
export function getFirebaseConfig(): FirebaseConfig {
  const sharedConfig = readSharedConfig();

  if (sharedConfig) {
    console.log("✅ Loaded Firebase config from iOS/macOS app");
    return sharedConfig;
  }

  throw new Error(
    "❌ Firebase configuration not found.\n\n" +
      "Please:\n" +
      "1. Install and open the To-Do app\n" +
      "2. Sign in with your account\n" +
      "3. The app will automatically share Firebase config with Raycast\n\n" +
      "The app writes config to:\n" +
      SHARED_CONFIG_PATH
  );
}
