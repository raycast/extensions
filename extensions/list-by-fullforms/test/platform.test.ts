import { describe, it, expect, vi, afterEach } from "vitest";
import { shortcutHint, crossShortcut } from "../src/lib/platform";

// The suite runs on macOS (darwin) in dev/CI, so the imported shortcutHint
// exercises the macOS branch directly. The Windows branch is covered by
// re-importing the module with process.platform stubbed, since isMacOS is
// captured at module load.

describe("shortcutHint on macOS", () => {
  it("renders modifier glyphs and an uppercased key", () => {
    expect(shortcutHint(["cmd", "shift"], "o")).toBe("⌘⇧O");
  });

  it("handles a single modifier", () => {
    expect(shortcutHint(["cmd"], "t")).toBe("⌘T");
  });
});

// crossShortcut always emits BOTH platform variants (it doesn't branch on
// isMacOS), so a bare cmd shortcut binds on Windows instead of silently
// no-opping there. The Windows variant translates cmd → ctrl / opt → alt,
// matching shortcutHint so a shortcut's hint and its real key never drift.
describe("crossShortcut", () => {
  it("emits macOS + Windows variants, translating cmd → ctrl", () => {
    expect(crossShortcut(["cmd"], "o")).toEqual({
      macOS: { modifiers: ["cmd"], key: "o" },
      Windows: { modifiers: ["ctrl"], key: "o" },
    });
  });

  it("translates opt → alt and preserves shift", () => {
    expect(crossShortcut(["cmd", "opt", "shift"], "t")).toEqual({
      macOS: { modifiers: ["cmd", "opt", "shift"], key: "t" },
      Windows: { modifiers: ["ctrl", "alt", "shift"], key: "t" },
    });
  });
});

describe("shortcutHint on Windows", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("renders '+'-joined names with Ctrl for cmd", async () => {
    const original = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    vi.resetModules();
    const { shortcutHint: winHint } = await import("../src/lib/platform");
    expect(winHint(["cmd", "shift"], "o")).toBe("Ctrl+Shift+O");
    expect(winHint(["opt"], "t")).toBe("Alt+T");
    Object.defineProperty(process, "platform", { value: original });
  });
});
