import { describe, expect, it, vi } from "vitest";

vi.mock("./aerospace", () => ({
  AeroSpaceError: class AeroSpaceError extends Error {
    constructor(
      message: string,
      readonly kind: string,
      options?: ErrorOptions,
    ) {
      super(message, options);
    }
  },
  aerospace: vi.fn(),
}));

import {
  bindingsMatch,
  describeCommand,
  extractShortcuts,
  extractWorkspaceKeys,
  parseAppConfig,
  parseLoadedConfigJson,
  splitCommandSequence,
  visibleShortcuts,
} from "./config";

describe("AeroSpace config", () => {
  it("parses the loaded root config returned by the CLI", () => {
    expect(
      parseLoadedConfigJson(
        JSON.stringify({
          mode: { main: { binding: { "alt-1": "workspace 1" } } },
        }),
      ),
    ).toEqual({ mode: { main: { binding: { "alt-1": "workspace 1" } } } });
  });

  it("rejects non-string binding commands", () => {
    expect(() => parseAppConfig({ mode: { main: { binding: { "alt-1": 1 } } } })).toThrow(
      'Expected binding "main.alt-1" to contain command strings.',
    );
  });

  it("extracts workspace keys with flags and ignores relative workspace motions", () => {
    const keys = extractWorkspaceKeys({
      mode: {
        main: {
          binding: {
            "alt-1": "workspace --auto-back-and-forth 1",
            "alt-n": "workspace next",
            "alt-p": "workspace prev",
            "alt-w": ["layout tiling", "workspace -- W"],
            "alt-z": "layout floating; workspace Z",
          },
        },
      },
    });

    expect(keys).toEqual({ "1": "alt-1", W: "alt-w", Z: "alt-z" });
  });

  it("flattens command arrays and skips empty bindings", () => {
    const shortcuts = extractShortcuts({
      mode: {
        main: {
          binding: {
            "alt-1": "workspace 1",
            "alt-shift-1": ["move-node-to-workspace 1", "workspace 1"],
            "alt-x": [],
          },
        },
      },
    });

    expect(shortcuts).toEqual([
      {
        mode: "main",
        key: "alt-1",
        command: "workspace 1",
        commands: ["workspace 1"],
        title: "Switch to Workspace 1",
        category: "Workspace",
      },
      {
        mode: "main",
        key: "alt-shift-1",
        command: "move-node-to-workspace 1, workspace 1",
        commands: ["move-node-to-workspace 1", "workspace 1"],
        title: "Move Window to Workspace 1 · Switch to Workspace 1",
        category: "Move",
      },
    ]);
  });

  it("humanizes common commands while keeping raw commands available", () => {
    expect(describeCommand("focus --wrap-around left")).toBe("Focus Left");
    expect(describeCommand("layout floating")).toBe("Set Layout: Floating");
    expect(describeCommand("mode service")).toBe("Enter Service Mode");
  });

  it("describes custom commands from their script name and positional arguments", () => {
    expect(
      describeCommand("exec-and-forget /bin/bash /Users/example/.config/aerospace/scripts/switch-context.sh WEB"),
    ).toBe("Switch Context WEB");
    expect(describeCommand("exec-and-forget open -a Ghostty")).toBe("Open Ghostty");
    expect(describeCommand("exec-and-forget open -a 'Google Chrome'")).toBe("Open Google Chrome");
    expect(describeCommand("exec-and-forget /Users/example/bin/cleanup-layout.sh")).toBe("Cleanup Layout");
  });

  it("unwraps interpreters and environment assignments while keeping safe fallbacks", () => {
    expect(
      describeCommand("exec-and-forget env PROFILE=work /bin/zsh -eu /Users/example/bin/sync-windows.command DEV"),
    ).toBe("Sync Windows DEV");
    expect(describeCommand("exec-and-forget sh -c 'one; two'")).toBe("Shell Command");
    expect(describeCommand("exec-and-forget")).toBe("Custom Command");
  });

  it("splits loaded command sequences without splitting quoted shell commands", () => {
    expect(splitCommandSequence("reload-config; mode main")).toEqual(["reload-config", "mode main"]);
    expect(splitCommandSequence("exec-and-forget sh -c 'one; two'; mode main")).toEqual([
      "exec-and-forget sh -c 'one; two'",
      "mode main",
    ]);

    const [shortcut] = extractShortcuts({
      mode: { service: { binding: { esc: "reload-config; mode main" } } },
    });
    expect(shortcut.title).toBe("Reload AeroSpace Config · Enter Main Mode");
    expect(shortcut.command).toBe("reload-config; mode main");
  });

  it("shows every mode by default and only the main mode when full bindings are disabled", () => {
    const shortcuts = extractShortcuts({
      mode: {
        main: { binding: { "alt-1": "workspace 1" } },
        service: { binding: { esc: "mode main" } },
      },
    });

    expect(visibleShortcuts(shortcuts, true)).toHaveLength(2);
    expect(visibleShortcuts(shortcuts, false).map((shortcut) => shortcut.mode)).toEqual(["main"]);
  });

  it("detects when the loaded bindings differ from the file", () => {
    const fileConfig = { mode: { main: { binding: { "alt-1": "workspace 1" } } } };
    expect(bindingsMatch(fileConfig, fileConfig)).toBe(true);
    expect(bindingsMatch(fileConfig, { mode: { main: { binding: { "alt-1": "workspace 2" } } } })).toBe(false);
  });

  it("treats command arrays and AeroSpace's semicolon-normalized loaded commands as equivalent", () => {
    expect(
      bindingsMatch(
        { mode: { service: { binding: { esc: ["reload-config", "mode main"] } } } },
        { mode: { service: { binding: { esc: "reload-config;  mode main" } } } },
      ),
    ).toBe(true);
    expect(
      bindingsMatch(
        { mode: { main: { binding: { x: "exec-and-forget open -a Ghostty" } } } },
        { mode: { main: { binding: { x: "exec-and-forget  open -a Ghostty" } } } },
      ),
    ).toBe(true);
    expect(
      bindingsMatch(
        { mode: { main: { binding: { x: `exec-and-forget sh -c 'one  two'` } } } },
        { mode: { main: { binding: { x: `exec-and-forget  sh -c 'one two'` } } } },
      ),
    ).toBe(false);
  });
});
