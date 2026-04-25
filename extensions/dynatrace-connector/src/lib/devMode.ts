// src/lib/devMode.ts
// Development mode utilities for testing UI without OAuth setup.
// Provides feature flags and mock data control for rapid UI development.

import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";

interface ExtensionPrefs {
  useMockData: boolean;
}

/**
 * Check if mock/development mode is enabled.
 * When enabled, all API calls return mock data instead of hitting real Dynatrace API.
 *
 * Usage:
 *  if (isMockMode()) {
 *    return MOCK_LOGS;
 *  }
 */
export function isMockMode(): boolean {
  const prefs = getPreferenceValues<ExtensionPrefs>();
  return prefs.useMockData === true;
}

/**
 * Development mode logger — only logs in mock mode to reduce noise.
 * Useful for debugging mock data flow.
 *
 * Usage:
 *  devLog("Building DQL query", { query, timeframe });
 */
export function devLog(message: string, data?: unknown): void {
  if (isMockMode()) {
    console.debug(`[DevMode] ${message}`, data);
  }
}

/**
 * Show a mock mode indicator toast (helpful during development).
 * Let users know they're in mock mode with sample data.
 */
export async function showMockModeIndicator(commandName: string): Promise<void> {
  if (isMockMode()) {
    await showToast({
      style: Toast.Style.Animated,
      title: `${commandName} (Mock Mode)`,
      message: "Using sample data — turn off in preferences to use real Dynatrace",
    });
  }
}

/**
 * Development preference manager — easily toggle mock mode and other dev settings.
 * Stores dev preferences separately from extension preferences.
 */
export async function getDevPreferences(): Promise<{
  mockMode: boolean;
  verbose: boolean;
  slowNetworkSimulation: boolean;
}> {
  const stored = await LocalStorage.getItem<string>("dev-prefs");
  if (!stored) {
    return {
      mockMode: isMockMode(),
      verbose: false,
      slowNetworkSimulation: false,
    };
  }

  try {
    return JSON.parse(stored);
  } catch {
    return {
      mockMode: isMockMode(),
      verbose: false,
      slowNetworkSimulation: false,
    };
  }
}

/**
 * Simulate network latency during development (helpful for testing loading states).
 * Range: 100-2000ms
 */
export async function simulateNetworkDelay(minMs = 100, maxMs = 500): Promise<void> {
  const prefs = await getDevPreferences();
  if (prefs.slowNetworkSimulation && isMockMode()) {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Development utilities for command testing.
 * Use these to quickly validate UI components with various data states.
 */
export const MockDataScenarios = {
  /**
   * Scenario: No data available (empty state)
   */
  empty: {
    logs: [],
    problems: [],
    deployments: [],
    entities: [],
    savedQueries: [],
  },

  /**
   * Scenario: All data available (normal operation)
   */
  full: {
    logs: "Use MOCK_LOGS from api/mock.ts",
    problems: "Use MOCK_PROBLEMS from api/mock.ts",
    deployments: "Use MOCK_DEPLOYMENTS from api/mock.ts",
    entities: "Use MOCK_ENTITIES from api/mock.ts",
    savedQueries: "Use MOCK_SAVED_QUERIES from api/mock.ts",
  },

  /**
   * Scenario: Error states (test error handling)
   */
  error: {
    logs: "Network error during fetch",
    problems: "Authentication failed",
    deployments: "Timeout — service unavailable",
    entities: "Invalid query syntax",
    savedQueries: "Database connection lost",
  },

  /**
   * Scenario: Slow/degraded performance (test loading states)
   */
  slowNetwork: {
    logs: "Simulate 2s delay in mock mode",
    problems: "Simulate 1.5s delay in mock mode",
    deployments: "Simulate 1s delay in mock mode",
    entities: "Simulate 800ms delay in mock mode",
    savedQueries: "Simulate 500ms delay in mock mode",
  },
};
