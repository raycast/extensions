import { describe, expect, it } from "vitest";
import { parseSettings } from "./settings";

describe("parseSettings", () => {
  it("applies defaults for empty preferences", () => {
    expect(parseSettings({})).toEqual({
      defaultModel: "system",
      defaultCreativity: "normal",
      quickAiIncludeSelection: true,
      copySelectionFallback: false,
      timeoutMs: 60000,
    });
  });

  it.each(["abc", "0", "4", "601"])("falls back to 60s for timeoutSeconds %j", (timeoutSeconds) => {
    expect(parseSettings({ timeoutSeconds }).timeoutMs).toBe(60000);
  });

  it("accepts the boundary timeouts", () => {
    expect(parseSettings({ timeoutSeconds: "5" }).timeoutMs).toBe(5000);
    expect(parseSettings({ timeoutSeconds: "600" }).timeoutMs).toBe(600000);
  });

  it("falls back for a blank model and an unknown creativity", () => {
    expect(parseSettings({ defaultModel: "  " }).defaultModel).toBe("system");
    expect(parseSettings({ defaultCreativity: "wild" }).defaultCreativity).toBe("normal");
  });
});
