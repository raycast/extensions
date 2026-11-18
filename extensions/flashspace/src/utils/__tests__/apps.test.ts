import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  Icon: {
    AppWindow: "app-window-icon",
  },
}));

import { buildOpenApplicationArgs, findInstalledApp, getAppIcon } from "../apps";

describe("apps helpers", () => {
  const installedApps = [
    { name: "iTerm2", bundleId: "com.googlecode.iterm2", path: "/Applications/iTerm.app" },
    { name: "Zen", localizedName: "Zen Browser", bundleId: "app.zen-browser.zen", path: "/Applications/Zen.app" },
  ];

  it("BUG 5: should prefer bundle id when opening an app", () => {
    expect(buildOpenApplicationArgs({ name: "iTerm2", bundleId: "com.googlecode.iterm2" }, installedApps)).toEqual([
      "-b",
      "com.googlecode.iterm2",
    ]);
  });

  it("should fall back to installed app path when bundle id is unavailable", () => {
    expect(buildOpenApplicationArgs({ name: "Zen Browser" }, installedApps)).toEqual(["/Applications/Zen.app"]);
  });

  it("should throw when no bundle id or installed app path can be found", () => {
    expect(() => buildOpenApplicationArgs({ name: "Missing App" }, installedApps)).toThrow(
      'Unable to determine how to open "Missing App"',
    );
  });

  it("should find installed apps by bundle id first", () => {
    expect(findInstalledApp(installedApps, { name: "Anything", bundleId: "com.googlecode.iterm2" })).toEqual(
      installedApps[0],
    );
  });

  it("should find installed apps by localized name", () => {
    expect(findInstalledApp(installedApps, { name: "Zen Browser" })).toEqual(installedApps[1]);
  });

  it("should build a file icon when the app is installed", () => {
    expect(getAppIcon(installedApps, { name: "iTerm2", bundleId: "com.googlecode.iterm2" })).toEqual({
      fileIcon: "/Applications/iTerm.app",
    });
  });

  it("should fall back to the generic app icon when the app is missing", () => {
    expect(getAppIcon(installedApps, { name: "Missing App" })).toBe("app-window-icon");
  });
});
