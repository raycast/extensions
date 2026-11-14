import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getApplications: vi.fn(),
  getPreferenceValues: vi.fn(() => ({})),
  open: vi.fn(),
  openExtensionPreferences: vi.fn(),
}));

import {
  AeroSpaceError,
  buildWorkspaceCatalog,
  parseWindowSnapshots,
  parseWorkspaceSnapshots,
  WindowSnapshot,
} from "./aerospace";

describe("AeroSpace response parsing", () => {
  it("parses the window fields requested by the runtime", () => {
    const windows = parseWindowSnapshots(
      JSON.stringify([
        {
          "app-name": "Terminal",
          "app-bundle-id": "com.apple.Terminal",
          "app-bundle-path": "/System/Applications/Utilities/Terminal.app",
          "window-title": "shell",
          "window-id": 42,
          workspace: "1",
          "monitor-name": "Built-in Retina Display",
          "workspace-is-focused": true,
          "workspace-is-visible": true,
          "window-layout": "v_tiles",
          "window-is-fullscreen": false,
        },
      ]),
    );

    expect(windows).toEqual([
      {
        appName: "Terminal",
        appBundleId: "com.apple.Terminal",
        appBundlePath: "/System/Applications/Utilities/Terminal.app",
        title: "shell",
        id: 42,
        workspace: "1",
        monitorName: "Built-in Retina Display",
        workspaceIsFocused: true,
        workspaceIsVisible: true,
        layout: "v_tiles",
        isFullscreen: false,
      },
    ]);
  });

  it("rejects a response that does not match the requested schema", () => {
    expect(() =>
      parseWorkspaceSnapshots(
        JSON.stringify([
          {
            workspace: "1",
            "workspace-is-focused": "yes",
            "workspace-is-visible": true,
            "monitor-name": "Built-in Retina Display",
            "workspace-root-container-layout": "v_tiles",
          },
        ]),
      ),
    ).toThrow(AeroSpaceError);
  });
});

describe("workspace catalog", () => {
  const windows: WindowSnapshot[] = [
    {
      appName: "Terminal",
      appBundleId: "com.apple.Terminal",
      appBundlePath: "/Applications/Terminal.app",
      title: "one",
      id: 1,
      workspace: "1",
      monitorName: "Main",
      workspaceIsFocused: true,
      workspaceIsVisible: true,
      layout: "v_tiles",
      isFullscreen: false,
    },
    {
      appName: "Terminal",
      appBundleId: "com.apple.Terminal",
      appBundlePath: "/Applications/Terminal.app",
      title: "two",
      id: 2,
      workspace: "1",
      monitorName: "Main",
      workspaceIsFocused: true,
      workspaceIsVisible: true,
      layout: "v_tiles",
      isFullscreen: false,
    },
    {
      appName: "Safari",
      appBundleId: "com.apple.Safari",
      appBundlePath: "/Applications/Safari.app",
      title: "Raycast",
      id: 3,
      workspace: "2",
      monitorName: "Main",
      workspaceIsFocused: false,
      workspaceIsVisible: false,
      layout: "v_tiles",
      isFullscreen: false,
    },
  ];

  it("deduplicates apps and keeps the focused workspace first", () => {
    const catalog = buildWorkspaceCatalog(
      [
        { name: "2", isFocused: false, isVisible: false, monitorName: "Main", rootLayout: "v_tiles" },
        { name: "1", isFocused: true, isVisible: true, monitorName: "Main", rootLayout: "v_tiles" },
      ],
      windows,
      { "1": "alt-1" },
    );

    expect(catalog.map((workspace) => workspace.name)).toEqual(["1", "2"]);
    expect(catalog[0].apps.map((app) => app.name)).toEqual(["Terminal"]);
    expect(catalog[0].binding).toBe("alt-1");
  });

  it("includes configured workspaces that do not have open windows", () => {
    const catalog = buildWorkspaceCatalog([], [], { "10": "alt-0", "2": "alt-2", W: "alt-w" });
    expect(catalog).toEqual([
      {
        name: "2",
        isFocused: false,
        isVisible: false,
        rootLayout: "",
        apps: [],
        binding: "alt-2",
      },
      {
        name: "10",
        isFocused: false,
        isVisible: false,
        rootLayout: "",
        apps: [],
        binding: "alt-0",
      },
      {
        name: "W",
        isFocused: false,
        isVisible: false,
        rootLayout: "",
        apps: [],
        binding: "alt-w",
      },
    ]);
  });

  it("orders focused, visible, non-empty, then empty workspaces", () => {
    const catalog = buildWorkspaceCatalog(
      [
        { name: "4", isFocused: false, isVisible: false, rootLayout: "v_tiles" },
        { name: "3", isFocused: false, isVisible: true, rootLayout: "v_tiles" },
        { name: "1", isFocused: true, isVisible: true, rootLayout: "v_tiles" },
        { name: "2", isFocused: false, isVisible: false, rootLayout: "v_tiles" },
      ],
      [
        {
          ...windows[2],
          workspace: "2",
          workspaceIsFocused: false,
          workspaceIsVisible: false,
        },
      ],
    );

    expect(catalog.map((workspace) => workspace.name)).toEqual(["1", "3", "2", "4"]);
  });
});
