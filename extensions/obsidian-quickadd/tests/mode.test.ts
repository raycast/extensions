import { describe, expect, it } from "vitest";
import { detectMode, isBasicReason, REASON_TEXT } from "../src/mode";

describe("detectMode", () => {
  it("needs a CLI binary", () => {
    expect(detectMode(undefined, { cli: true, openVaults: [] })).toEqual({ mode: "basic", reason: "no-cli" });
  });

  it("needs the CLI switched on", () => {
    expect(detectMode("/x/obsidian-cli", { cli: false, openVaults: [] })).toEqual({
      mode: "basic",
      reason: "cli-disabled",
    });
  });

  it("is full otherwise", () => {
    expect(detectMode("/x/obsidian-cli", { cli: true, openVaults: [] })).toEqual({
      mode: "full",
      cli: "/x/obsidian-cli",
    });
  });

  it("has user-facing text for every reason", () => {
    expect(REASON_TEXT["cli-disabled"]).toBe(
      "Turn on Settings → General → Advanced → Command line interface in Obsidian, then restart Obsidian.",
    );
    expect(REASON_TEXT["quickadd-old"]).toBe("QuickAdd isn't enabled in this vault, or is older than 2.27.");
    expect(isBasicReason("quickadd-old")).toBe(true);
    expect(isBasicReason("timeout")).toBe(false);
  });
});
