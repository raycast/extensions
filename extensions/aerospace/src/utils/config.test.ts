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

import { extractShortcuts, extractWorkspaceKeys, parseAppConfig, parseLoadedConfigJson } from "./config";

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
          },
        },
      },
    });

    expect(keys).toEqual({ "1": "alt-1", W: "alt-w" });
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
      { mode: "main", key: "alt-1", command: "workspace 1" },
      {
        mode: "main",
        key: "alt-shift-1",
        command: "move-node-to-workspace 1, workspace 1",
      },
    ]);
  });
});
