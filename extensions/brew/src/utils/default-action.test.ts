import { describe, expect, it } from "vitest";
import { slotRunsInTerminal } from "./default-action";
import { preferences } from "./preferences";

describe("slotRunsInTerminal", () => {
  it("keeps the in-Raycast action first by default", () => {
    expect(slotRunsInTerminal("first", false)).toBe(false);
    expect(slotRunsInTerminal("terminal", false)).toBe(true);
  });

  it("swaps the pair when the preference is on", () => {
    expect(slotRunsInTerminal("first", true)).toBe(true);
    expect(slotRunsInTerminal("terminal", true)).toBe(false);
  });

  it("keeps a pinned package's Uninstall first even with the preference on", () => {
    expect(slotRunsInTerminal("first", true, true)).toBe(false);
    expect(slotRunsInTerminal("first", false, true)).toBe(false);
  });

  it("puts exactly one action of the pair in the terminal", () => {
    for (const inTerminalByDefault of [false, true]) {
      for (const pinned of [false, true]) {
        const first = slotRunsInTerminal("first", inTerminalByDefault, pinned);
        const terminal = slotRunsInTerminal("terminal", inTerminalByDefault, pinned);
        expect(first).not.toBe(terminal);
      }
    }
  });
});

describe("runInTerminalByDefault preference", () => {
  it("is declared off, so existing installs keep ↩ running Install in Raycast", () => {
    expect(preferences.runInTerminalByDefault).toBe(false);
  });
});
