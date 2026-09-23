import { describe, expect, it } from "vitest";
import { appCpuSeries, appName, bundlePath, groupByApp } from "../src/analysis/apps";
import { Sample } from "../src/types";

describe("bundlePath", () => {
  it("cuts the path at the outermost app bundle", () => {
    expect(bundlePath("/Applications/Microsoft Teams.app/Contents/Helpers/X.app/Contents/MacOS/X")).toBe(
      "/Applications/Microsoft Teams.app",
    );
    expect(bundlePath("/usr/sbin/coreaudiod")).toBeUndefined();
    expect(bundlePath(undefined)).toBeUndefined();
  });
});

describe("appCpuSeries", () => {
  it("sums the CPU of the app's current processes in each sample, 0 where none is among its top 10, then adds now", () => {
    const history: Sample[] = [
      {
        t: 0,
        procs: [
          { pid: 1, cmd: "MSTeams", cpu: 5, energy: 5 },
          { pid: 2, cmd: "Helper", cpu: 10, energy: 10 },
          { pid: 9, cmd: "other", cpu: 50, energy: 50 },
        ],
      },
      { t: 60_000, procs: [{ pid: 9, cmd: "other", cpu: 50, energy: 50 }] }, // app absent
      { t: 120_000, procs: [{ pid: 2, cmd: "Helper", cpu: 20, energy: 20 }] },
    ];
    expect(appCpuSeries(history, [1, 2], 180_000, 31)).toEqual([
      { t: 0, w: 15 },
      { t: 60_000, w: 0 },
      { t: 120_000, w: 20 },
      { t: 180_000, w: 31 },
    ]);
  });
});
import { ProcessInfo } from "../src/types";

const TEAMS = "/Applications/Microsoft Teams.app";
const info = (path: string): ProcessInfo => ({
  etimeSec: 1,
  cpuTimeSec: 0,
  user: "me",
  ppid: 1,
  command: path.slice(path.lastIndexOf("/") + 1),
  path,
});

describe("appName", () => {
  it("uses the outermost app bundle, so helpers belong to their app", () => {
    expect(
      appName(
        `${TEAMS}/Contents/Helpers/Microsoft Teams WebView.app/Contents/MacOS/Microsoft Teams WebView Helper`,
        "x",
      ),
    ).toBe("Microsoft Teams");
    expect(appName("/System/Applications/Mail.app/Contents/MacOS/Mail", "x")).toBe("Mail");
  });

  it("falls back to the process name for plain binaries or an unknown path", () => {
    expect(appName("/usr/sbin/coreaudiod", "coreaudiod")).toBe("coreaudiod");
    expect(appName(undefined, "kernel_task")).toBe("kernel_task");
  });
});

describe("groupByApp", () => {
  it("lists only real apps; system processes and command-line tools belong to Processes", () => {
    const processes = [
      { pid: 3, command: "WindowServer", energy: 40, cpu: 38 },
      { pid: 5, command: "claude", energy: 9, cpu: 9 },
      { pid: 4, command: "Raycast", energy: 5, cpu: 4 },
    ];
    const map = new Map([
      [3, info("/System/Library/PrivateFrameworks/SkyLight.framework/Resources/WindowServer")],
      [5, info("claude")],
      [4, info("/Applications/Raycast.app/Contents/MacOS/Raycast")],
    ]);
    expect(groupByApp(processes, map).map((a) => a.name)).toEqual(["Raycast"]);
    expect(groupByApp(processes, new Map())).toEqual([]); // no path known → not an app
  });

  it("sums energy and CPU per app and sorts by energy", () => {
    const processes = [
      { pid: 1, command: "MSTeams", energy: 10, cpu: 8 },
      { pid: 2, command: "Microsoft Teams WebView Helper", energy: 21, cpu: 20 },
      { pid: 3, command: "WindowServer", energy: 40, cpu: 38 },
      { pid: 4, command: "Raycast", energy: 5, cpu: 4 },
    ];
    const map = new Map([
      [1, info(`${TEAMS}/Contents/MacOS/MSTeams`)],
      [2, info(`${TEAMS}/Contents/Helpers/Microsoft Teams WebView.app/Contents/MacOS/Microsoft Teams WebView Helper`)],
      [3, info("/System/Library/PrivateFrameworks/SkyLight.framework/Resources/WindowServer")],
      [4, info("/Applications/Raycast.app/Contents/MacOS/Raycast")],
    ]);
    expect(groupByApp(processes, map)).toEqual([
      { name: "Microsoft Teams", energy: 31, cpu: 28, pids: [1, 2] },
      { name: "Raycast", energy: 5, cpu: 4, pids: [4] },
    ]);
  });

  it("never merges two different apps that share an executable name", () => {
    const processes = [
      { pid: 1, command: "Helper", energy: 1, cpu: 1 },
      { pid: 2, command: "Helper", energy: 1, cpu: 1 },
    ];
    const map = new Map([
      [1, info("/Applications/A.app/Contents/MacOS/Helper")],
      [2, info("/Applications/B.app/Contents/MacOS/Helper")],
    ]);
    expect(groupByApp(processes, map).map((a) => a.name)).toEqual(["A", "B"]);
  });
});
