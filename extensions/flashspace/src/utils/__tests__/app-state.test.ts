import { describe, expect, it } from "vitest";
import { buildAssignedAppItems, buildFloatingAppItems, getAppIdentifier } from "../app-state";

describe("app state helpers", () => {
  it("should prefer bundle id as the stable app identifier", () => {
    expect(getAppIdentifier({ name: "iTerm2", bundleId: "com.googlecode.iterm2" })).toBe("com.googlecode.iterm2");
    expect(getAppIdentifier({ name: "Notes" })).toBe("Notes");
  });

  it("should mark assigned running apps and preserve an unassigned override", () => {
    const items = buildAssignedAppItems(
      [
        { name: "iTerm2", bundleId: "com.googlecode.iterm2" },
        { name: "Safari", bundleId: "com.apple.Safari" },
      ],
      {
        "com.googlecode.iterm2": ["Terminal"],
      },
      {
        "com.googlecode.iterm2": {
          app: { name: "iTerm2", bundleId: "com.googlecode.iterm2" },
          isAssigned: false,
        },
      },
      "Terminal",
    );

    expect(items).toEqual([
      {
        name: "iTerm2",
        bundleId: "com.googlecode.iterm2",
        identifier: "com.googlecode.iterm2",
        isAssigned: false,
        assignedWorkspaces: [],
      },
      {
        name: "Safari",
        bundleId: "com.apple.Safari",
        identifier: "com.apple.Safari",
        isAssigned: false,
        assignedWorkspaces: [],
      },
    ]);
  });

  it("should use the active workspace when an assign override makes an app assigned again", () => {
    const items = buildAssignedAppItems(
      [{ name: "Safari", bundleId: "com.apple.Safari" }],
      {},
      {
        "com.apple.Safari": {
          app: { name: "Safari", bundleId: "com.apple.Safari" },
          isAssigned: true,
        },
      },
      "Browser",
    );

    expect(items[0].assignedWorkspaces).toEqual(["Browser"]);
    expect(items[0].isAssigned).toBe(true);
  });

  it("should keep recently unfloated apps visible with their new state", () => {
    const items = buildFloatingAppItems([], [{ name: "Raycast", bundleId: "com.raycast.macos" }], {
      "com.raycast.macos": {
        app: { name: "Raycast", bundleId: "com.raycast.macos" },
        isFloating: false,
      },
    });

    expect(items).toEqual([
      {
        name: "Raycast",
        bundleId: "com.raycast.macos",
        identifier: "com.raycast.macos",
        isFloating: false,
      },
    ]);
  });

  it("should include running apps that are not floating yet so they can be floated", () => {
    const items = buildFloatingAppItems(
      [
        { name: "Finder", bundleId: "com.apple.finder" },
        { name: "Raycast", bundleId: "com.raycast.macos" },
      ],
      [{ name: "Raycast", bundleId: "com.raycast.macos" }],
    );

    expect(items).toEqual([
      {
        name: "Finder",
        bundleId: "com.apple.finder",
        identifier: "com.apple.finder",
        isFloating: false,
      },
      {
        name: "Raycast",
        bundleId: "com.raycast.macos",
        identifier: "com.raycast.macos",
        isFloating: true,
      },
    ]);
  });

  it("should include newly overridden floating items even when the backend list is empty", () => {
    const items = buildFloatingAppItems([], [], {
      "com.raycast.macos": {
        app: { name: "Raycast", bundleId: "com.raycast.macos" },
        isFloating: false,
      },
    });

    expect(items).toEqual([
      {
        name: "Raycast",
        bundleId: "com.raycast.macos",
        identifier: "com.raycast.macos",
        isFloating: false,
      },
    ]);
  });
});
