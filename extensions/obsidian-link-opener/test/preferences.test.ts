/**
 * Tests for the Preferences interface
 */

import { describe, it, expect } from "vitest";
import { Preferences } from "../src/types/index";
import { usePreferences } from "./mocks/usePreferences";

describe("Preferences", () => {
  it("should have the correct structure", () => {
    const preferences: Preferences = {
      vaultPath: "/path/to/vault",
      refreshInterval: 24,
    };

    expect(preferences).toHaveProperty("vaultPath");
    expect(preferences).toHaveProperty("refreshInterval");
    expect(typeof preferences.vaultPath).toBe("string");
    expect(typeof preferences.refreshInterval).toBe("number");
  });

  it("should use mocked preferences correctly", () => {
    const preferences = usePreferences();
    
    expect(preferences.vaultPath).toBe("/path/to/vault");
    expect(preferences.refreshInterval).toBe(24);
  });
});
