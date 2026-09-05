import { describe, expect, it } from "vitest";
import type { QuickShellSettings } from "../lib/schema";
import { DEFAULT_SETTINGS } from "../lib/schema";
import { groupLaunchEntries } from "../lib/launch-grouping";
import type { LaunchPlanEntry } from "../lib/windows-launch";
import { resolveLaunchTarget } from "../lib/windows-launch";

const settings: QuickShellSettings = {
  ...DEFAULT_SETTINGS,
  terminalApplication: "wt",
};

function entry(terminal: string, overrides: Partial<LaunchPlanEntry> = {}): LaunchPlanEntry {
  return {
    workspace: {
      id: "1",
      name: "Demo",
      directory: "C:\\Projects\\demo",
      isPinned: false,
      terminal: "wt",
      runAsAdmin: false,
      launches: [],
    },
    launch: {
      id: "1a",
      label: "Main",
      terminal,
      command: "echo",
      runAsAdmin: false,
      isEnabled: true,
      order: 0,
    },
    target: resolveLaunchTarget(terminal),
    directory: "C:\\Projects\\demo",
    command: "echo",
    runAsAdmin: false,
    ...overrides,
  };
}

describe("launch-grouping", () => {
  it("groups multiple wt entries into one tab host group", () => {
    const groups = groupLaunchEntries(
      [entry("wt"), entry("wt", { launch: { ...entry("wt").launch, id: "2", order: 1 } })],
      settings,
      false,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].tabHostExecutable).toBe("wt.exe");
    expect(groups[0].entries).toHaveLength(2);
  });

  it("routes cmd launches through wt when global app uses wt", () => {
    const groups = groupLaunchEntries([entry("wt"), entry("cmd")], settings, false);

    expect(groups).toHaveLength(1);
    expect(groups[0].tabHostExecutable).toBe("wt.exe");
    expect(groups[0].entries).toHaveLength(2);
  });

  it("splits mixed elevation into separate groups", () => {
    const groups = groupLaunchEntries([entry("wt"), entry("wt", { runAsAdmin: true })], settings, false);

    expect(groups).toHaveLength(2);
    expect(groups.some((group) => group.runAsAdmin)).toBe(true);
    expect(groups.some((group) => !group.runAsAdmin)).toBe(true);
  });

  it("uses separate windows when requested", () => {
    const groups = groupLaunchEntries([entry("wt"), entry("wt")], settings, true);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.entries.length === 1)).toBe(true);
  });

  it("does not tab when console host is selected", () => {
    const conhostSettings: QuickShellSettings = {
      ...settings,
      terminalApplication: "conhost",
    };

    const groups = groupLaunchEntries([entry("cmd"), entry("cmd")], conhostSettings, false);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.tabHostExecutable === null)).toBe(true);
  });
});
