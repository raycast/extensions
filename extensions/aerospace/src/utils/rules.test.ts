import { describe, expect, it } from "vitest";
import { parse } from "smol-toml";
import { WindowSnapshot } from "./aerospace";
import { createWindowRule } from "./rules";

const window: WindowSnapshot = {
  appName: "Terminal",
  appBundleId: "com.apple.Terminal",
  appBundlePath: "/Applications/Terminal.app",
  title: "shell",
  id: 1,
  workspace: "Dev Space",
  monitorName: "Main",
  workspaceIsFocused: true,
  workspaceIsVisible: true,
  layout: "v_tiles",
  isFullscreen: false,
};

describe("window rule", () => {
  it("generates a copy-only rule using the stable bundle id and current workspace", () => {
    expect(createWindowRule(window)).toBe(
      [
        "# Terminal",
        "[[on-window-detected]]",
        'if.app-id = "com.apple.Terminal"',
        'run = ["move-node-to-workspace -- \\"Dev Space\\"", "layout tiling"]',
      ].join("\n"),
    );
    expect(() => parse(createWindowRule(window))).not.toThrow();
  });

  it("preserves a floating layout", () => {
    expect(createWindowRule({ ...window, layout: "floating" })).toContain('"layout floating"');
  });
});
