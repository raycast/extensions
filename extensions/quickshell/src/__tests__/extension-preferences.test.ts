import { afterEach, describe, expect, it } from "vitest";
import { type ExtensionPreferences, preferencesToSettings } from "../lib/preferences";

describe("extension-preferences", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { configurable: true, value: originalPlatform });
  });

  it("maps Raycast preferences to QuickShell settings", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
    const settings = preferencesToSettings({
      terminalApplication: "conhost",
      defaultProfile: "__default__",
      showRecents: false,
      blockDirtyBranchSwitch: false,
    });

    expect(settings.terminalApplication).toBe("conhost");
    expect(settings.defaultProfile).toBe("__default__");
    expect(settings.recentWorkspaceCount).toBe(0);
    expect(settings.multiLaunchPresentation).toBe("singleWindowTabs");
    expect(settings.blockDirtyBranchSwitch).toBe(false);
  });

  it("falls back to defaults for missing preference values", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
    const settings = preferencesToSettings({});
    expect(settings.terminalApplication).toBe("wt");
    expect(settings.defaultProfile).toBe("__default__");
    expect(settings.recentWorkspaceCount).toBe(8);
    expect(settings.multiLaunchPresentation).toBe("singleWindowTabs");
    expect(settings.blockDirtyBranchSwitch).toBe(true);
  });

  it("falls back to wt for unknown terminalApplication values on Windows", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
    const settings = preferencesToSettings({
      terminalApplication: "bogus" as unknown as ExtensionPreferences["terminalApplication"],
    });
    expect(settings.terminalApplication).toBe("wt");
  });

  it("maps singleWindowTabs preference to multiLaunchPresentation on Windows", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
    const tabs = preferencesToSettings({ singleWindowTabs: true });
    expect(tabs.multiLaunchPresentation).toBe("singleWindowTabs");

    const windows = preferencesToSettings({ singleWindowTabs: false });
    expect(windows.multiLaunchPresentation).toBe("separateWindows");
  });

  it("normalizes Windows terminals to Terminal.app on macOS and forces separate windows", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "darwin" });
    const settings = preferencesToSettings({
      terminalApplication: "wt",
      singleWindowTabs: true,
    });
    expect(settings.terminalApplication).toBe("terminal");
    expect(settings.multiLaunchPresentation).toBe("separateWindows");
  });

  it("accepts iterm on macOS", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "darwin" });
    const settings = preferencesToSettings({ terminalApplication: "iterm" });
    expect(settings.terminalApplication).toBe("iterm");
  });
});
