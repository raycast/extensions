/**
 * Test-only stand-in for `@raycast/api`.
 *
 * The real package has no resolvable entry point outside the Raycast runtime,
 * so `vitest.config.ts` aliases it here. Only the pieces our unit-tested
 * helpers touch need to exist.
 */

/**
 * Preference values used by unit tests. Individual tests can override these
 * via `setPreferences` when they need a different configuration.
 */
let preferences: Record<string, string> = {
  apiUrl: "https://vikunja.test",
  apiToken: "test-token",
  defaultProject: "all",
  quickAddMagicMode: "vikunja",
  defaultReminder: "none",
};

export function getPreferenceValues() {
  return preferences;
}

/** Test-only: replace or extend the stubbed preferences. */
export function setPreferences(next: Record<string, string>): void {
  preferences = { ...preferences, ...next };
}

/** Test-only: restore the default stubbed preferences. */
export function resetPreferences(): void {
  preferences = {
    apiUrl: "https://vikunja.test",
    apiToken: "test-token",
    defaultProject: "all",
    quickAddMagicMode: "vikunja",
    defaultReminder: "none",
  };
}

export const Color = {
  SecondaryText: "secondary",
  Blue: "blue",
  Yellow: "yellow",
  Orange: "orange",
  Red: "red",
  Magenta: "magenta",
  Green: "green",
  PrimaryText: "primary",
  Purple: "purple",
} as const;

export const Icon = {} as Record<string, string>;

export const Toast = {
  Style: {
    Success: "SUCCESS",
    Failure: "FAILURE",
    Animated: "ANIMATED",
  },
} as const;

/** In-memory stand-in for Raycast's LocalStorage, so history logic is testable. */
const store = new Map<string, string>();

export const LocalStorage = {
  async getItem<T = string>(key: string): Promise<T | undefined> {
    return store.get(key) as T | undefined;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async clear(): Promise<void> {
    store.clear();
  },
  /** Test-only escape hatch for seeding malformed values. */
  __reset(): void {
    store.clear();
  },
};
