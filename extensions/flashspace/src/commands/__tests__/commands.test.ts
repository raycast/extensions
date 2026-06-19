import { describe, expect, it, vi } from "vitest";

// Mock the @raycast/api module since cli.ts imports from it
vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({})),
}));

import { parseApps, parseLines, parseRunningApps, parseWorkspaces } from "../../utils/cli";

/**
 * Tests for the parsing logic used across various commands.
 * Each test group corresponds to a specific command/feature and validates
 * the data transformation from CLI output to structured data.
 */

describe("List Workspaces command parsing", () => {
  it("BUG 1: should correctly separate workspace name from display info", () => {
    // BUG 1 reported: "Terminal,Built-in Retina Display" was being passed as workspace name
    const cliOutput = "Terminal,Built-in Retina Display\nBrowser,LG HDR WQHD\n";
    const workspaces = parseWorkspaces(cliOutput);

    expect(workspaces).toHaveLength(2);
    expect(workspaces[0].name).toBe("Terminal");
    expect(workspaces[0].display).toBe("Built-in Retina Display");
    expect(workspaces[1].name).toBe("Browser");
    expect(workspaces[1].display).toBe("LG HDR WQHD");
  });

  it("BUG 1: workspace name should not contain display information", () => {
    const cliOutput = "Development,Built-in Retina Display\n";
    const workspaces = parseWorkspaces(cliOutput);

    // The name passed to CLI should be "Development", not "Development,Built-in Retina Display"
    expect(workspaces[0].name).toBe("Development");
    expect(workspaces[0].name).not.toContain(",");
    expect(workspaces[0].name).not.toContain("Built-in");
  });

  it("should handle workspaces without display info", () => {
    const cliOutput = "Workspace1\nWorkspace2\n";
    const workspaces = parseWorkspaces(cliOutput);

    expect(workspaces).toHaveLength(2);
    expect(workspaces[0]).toEqual({ name: "Workspace1" });
    expect(workspaces[1]).toEqual({ name: "Workspace2" });
  });

  it("should handle None display as no display", () => {
    const cliOutput = "MyWorkspace,None\n";
    const workspaces = parseWorkspaces(cliOutput);

    expect(workspaces[0].name).toBe("MyWorkspace");
    expect(workspaces[0].display).toBeUndefined();
  });
});

describe("Activate Workspace command", () => {
  it("BUG 2: workspace list should be filterable by search", () => {
    // This test validates the workspace list parsing used by activate workspace
    const cliOutput = "Development\nDesign\nTerminal\nBrowser\n";
    const workspaces = parseLines(cliOutput);

    // The list should contain all workspaces
    expect(workspaces).toHaveLength(4);
    expect(workspaces).toContain("Development");
    expect(workspaces).toContain("Design");
    expect(workspaces).toContain("Terminal");
    expect(workspaces).toContain("Browser");

    // Filtering behavior (simulated - the actual filtering is done by Raycast List component)
    const filtered = workspaces.filter((w) => w.toLowerCase().includes("dev"));
    expect(filtered).toEqual(["Development"]);
  });
});

describe("List Workspace Apps command parsing", () => {
  it("BUG 3a: should parse apps with proper name and bundleId separation", () => {
    // BUG 3: was showing "iTerm2,com.googlecode.iterm2" as a single field
    const cliOutput = "iTerm2,com.googlecode.iterm2\nSafari,com.apple.Safari\n";
    const apps = parseApps(cliOutput);

    expect(apps).toHaveLength(2);
    expect(apps[0].name).toBe("iTerm2");
    expect(apps[0].bundleId).toBe("com.googlecode.iterm2");
    expect(apps[1].name).toBe("Safari");
    expect(apps[1].bundleId).toBe("com.apple.Safari");
  });

  it("BUG 3a: app name should not contain the bundle ID", () => {
    const cliOutput = "iTerm2,com.googlecode.iterm2\n";
    const apps = parseApps(cliOutput);

    expect(apps[0].name).toBe("iTerm2");
    expect(apps[0].name).not.toContain("com.googlecode");
    expect(apps[0].name).not.toContain(",");
  });

  it("should handle apps without bundle ID", () => {
    const cliOutput = "SomeApp\n";
    const apps = parseApps(cliOutput);

    expect(apps).toHaveLength(1);
    expect(apps[0].name).toBe("SomeApp");
    expect(apps[0].bundleId).toBeUndefined();
  });
});

describe("List Running Apps command parsing", () => {
  it("BUG 3b: should parse running apps with bundleId for focus action", () => {
    const cliOutput = "iTerm2,com.googlecode.iterm2\nSafari,com.apple.Safari\n";
    const apps = parseRunningApps(cliOutput);

    expect(apps).toHaveLength(2);
    // bundleId should be available for the focus action (open -b bundleId)
    expect(apps[0].bundleId).toBe("com.googlecode.iterm2");
    expect(apps[1].bundleId).toBe("com.apple.Safari");
  });

  it("should have bundleId available for each running app", () => {
    const cliOutput = "Finder,com.apple.finder\nMail,com.apple.mail\n";
    const apps = parseRunningApps(cliOutput);

    for (const app of apps) {
      expect(app.bundleId).toBeDefined();
      expect(app.bundleId).not.toBe("");
    }
  });
});

describe("Unassign App command parsing", () => {
  it("BUG 4: should extract bundleId correctly for unassign command", () => {
    // BUG 4: was passing "iTerm2,com.googlecode.iterm2" instead of "com.googlecode.iterm2"
    const cliOutput = "iTerm2,com.googlecode.iterm2\nSafari,com.apple.Safari\n";
    const apps = parseRunningApps(cliOutput);

    // The bundleId should be properly separated from the name
    expect(apps[0].bundleId).toBe("com.googlecode.iterm2");
    expect(apps[0].name).toBe("iTerm2");

    // The identifier passed to CLI should be the bundleId, not "name,bundleId"
    const identifierForCli = apps[0].bundleId;
    expect(identifierForCli).not.toContain(",");
    expect(identifierForCli).toBe("com.googlecode.iterm2");
  });

  it("BUG 4: bundleId should not contain the app name", () => {
    const cliOutput = "Visual Studio Code,com.microsoft.VSCode\n";
    const apps = parseRunningApps(cliOutput);

    expect(apps[0].bundleId).toBe("com.microsoft.VSCode");
    expect(apps[0].bundleId).not.toContain("Visual Studio Code");
  });
});

describe("Floating Apps command parsing", () => {
  it("should parse floating apps with bundleId", () => {
    const cliOutput = "Finder,com.apple.finder\nMessages,com.apple.MobileSMS\n";
    const apps = parseApps(cliOutput);

    expect(apps).toHaveLength(2);
    expect(apps[0]).toEqual({ name: "Finder", bundleId: "com.apple.finder" });
    expect(apps[1]).toEqual({ name: "Messages", bundleId: "com.apple.MobileSMS" });
  });
});

describe("Assign App command parsing", () => {
  it("should parse running apps for selection with bundleId", () => {
    const cliOutput = "Slack,com.tinyspeck.slackmacgap\nZoom,us.zoom.xos\n";
    const apps = parseRunningApps(cliOutput);

    expect(apps).toHaveLength(2);
    // Assign app should pass bundleId to the CLI
    expect(apps[0].bundleId).toBe("com.tinyspeck.slackmacgap");
    expect(apps[1].bundleId).toBe("us.zoom.xos");
  });
});

describe("Profile commands parsing", () => {
  it("should parse profile names from list-profiles output", () => {
    const cliOutput = "Default\nWork\nPersonal\n";
    const profiles = parseLines(cliOutput);

    expect(profiles).toHaveLength(3);
    expect(profiles).toEqual(["Default", "Work", "Personal"]);
  });

  it("should handle single profile", () => {
    const cliOutput = "Default\n";
    const profiles = parseLines(cliOutput);

    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toBe("Default");
  });
});

describe("Display commands parsing", () => {
  it("should parse display names from list-displays output", () => {
    const cliOutput = "Built-in Retina Display\nLG HDR WQHD\n";
    const displays = parseLines(cliOutput);

    expect(displays).toHaveLength(2);
    expect(displays[0]).toBe("Built-in Retina Display");
    expect(displays[1]).toBe("LG HDR WQHD");
  });
});

describe("Edge cases across all commands", () => {
  it("should handle empty CLI output gracefully", () => {
    expect(parseLines("")).toEqual([]);
    expect(parseWorkspaces("")).toEqual([]);
    expect(parseApps("")).toEqual([]);
    expect(parseRunningApps("")).toEqual([]);
  });

  it("should handle whitespace-only CLI output", () => {
    expect(parseLines("   \n  \n")).toEqual([]);
  });

  it("should handle special characters in workspace names", () => {
    const cliOutput = "Work & Play,Display\nMy (Dev) Space,Monitor\n";
    const workspaces = parseWorkspaces(cliOutput);

    expect(workspaces[0].name).toBe("Work & Play");
    expect(workspaces[1].name).toBe("My (Dev) Space");
  });

  it("should handle special characters in app names", () => {
    const cliOutput = "App (v2.0),com.example.app\nC++ Editor,com.example.cpp\n";
    const apps = parseApps(cliOutput);

    expect(apps[0].name).toBe("App (v2.0)");
    expect(apps[1].name).toBe("C++ Editor");
  });

  it("should handle app names that look like bundle IDs", () => {
    const cliOutput = "com.app.name,com.app.bundleid\n";
    const apps = parseApps(cliOutput);

    expect(apps[0].name).toBe("com.app.name");
    expect(apps[0].bundleId).toBe("com.app.bundleid");
  });
});
