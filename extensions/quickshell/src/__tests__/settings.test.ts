import { describe, expect, it } from "vitest";
import { isRecentSectionEnabled, normalizeRecentCount } from "../lib/settings";

describe("settings", () => {
  it("treats any positive recent count as enabled with 8 items", () => {
    expect(isRecentSectionEnabled(8)).toBe(true);
    expect(isRecentSectionEnabled(1)).toBe(true);
    expect(isRecentSectionEnabled(0)).toBe(false);
    expect(normalizeRecentCount(3)).toBe(8);
  });
});
