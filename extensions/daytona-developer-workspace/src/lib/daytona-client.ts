/**
 * Daytona Client Singleton
 * Task 16.2: Shared client instance for all commands
 */

import { Daytona } from "@daytonaio/sdk";
import { getPreferenceValues } from "@raycast/api";

let daytonaClientInstance: Daytona | null = null;

/**
 * Initialize and return the shared Daytona client instance
 * Ensures singleton pattern across all commands
 */
export function getDaytonaClient(): Daytona {
  if (!daytonaClientInstance) {
    console.log("🔄 Initializing shared Daytona client singleton");

    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.apiKey) {
      throw new Error("Daytona API key is required. Please configure it in Raycast preferences.");
    }

    daytonaClientInstance = new Daytona({
      apiKey: preferences.apiKey,
    });

    console.log("✅ Daytona client singleton initialized");
  } else {
    console.log("♻️ Reusing existing Daytona client singleton");
  }

  return daytonaClientInstance;
}

/**
 * Reset the client instance (for testing or re-authentication)
 */
export function resetDaytonaClient(): void {
  console.log("🔄 Resetting Daytona client singleton");
  daytonaClientInstance = null;
}

/**
 * Check if client is initialized
 */
export function isDaytonaClientInitialized(): boolean {
  return daytonaClientInstance !== null;
}
