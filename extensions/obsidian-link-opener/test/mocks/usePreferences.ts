/**
 * Mock implementation of usePreferences hook
 */

import { Preferences } from "../../src/types/index";

export function usePreferences(): Preferences {
  return {
    vaultPath: "/path/to/vault",
    refreshInterval: 24,
  };
}
