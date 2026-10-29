import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { commandEnv, Runner } from "../src/collectors/exec";
import { parseCpuTime, parseEtime, parsePs, readProcesses } from "../src/collectors/ps";
import { parseTop } from "../src/collectors/top";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("parseTop", () => {
  it("reads only the last sample block", () => {
    const rows = parseTop(fixture("top.txt"));
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual({ pid: 10449, command: "zsh", energy: 99.1, cpu: 99.1 });
    expect(rows.find((r) => r.pid === 410)?.energy).toBe(16.0);
  });

  it("keeps command names that contain spaces", () => {
    const rows = parseTop(fixture("top.txt"));
    expect(rows.find((r) => r.pid === 891)?.command).toBe("Example Sync Ser");
    expect(rows.find((r) => r.pid === 8598)).toEqual({ pid: 8598, command: "Microsoft Teams", energy: 2.4, cpu: 2.9 });
  });

  it("returns an empty list without a header", () => {
    expect(parseTop("garbage")).toEqual([]);
  });
});

describe("ps time formats", () => {
  it("parses etime with days, hours and minutes", () => {
    expect(parseEtime("01-00:21:15")).toBe(86400 + 21 * 60 + 15);
    expect(parseEtime("22:12:22")).toBe(22 * 3600 + 12 * 60 + 22);
    expect(parseEtime("02:27")).toBe(147);
  });

  it("parses cpu time as minutes:seconds or hours:minutes:seconds", () => {
    expect(parseCpuTime("1321:02.22")).toBeCloseTo(1321 * 60 + 2.22);
    expect(parseCpuTime("0:11.72")).toBeCloseTo(11.72);
    expect(parseCpuTime("2:03:04")).toBe(2 * 3600 + 3 * 60 + 4);
  });
});

describe("parsePs", () => {
  it("maps pid to uptime, cpu time, user, parent and command", () => {
    const info = parsePs(fixture("ps.txt"));
    expect(info.size).toBe(5);
    expect(info.get(10449)).toEqual({
      etimeSec: 79942,
      cpuTimeSec: expect.closeTo(79262.22),
      user: "johndoe",
      ppid: 4620,
      command: "zsh",
      path: "-zsh",
    });
    expect(info.get(410)?.user).toBe("_windowserver");
  });

  it("takes the executable name from paths that contain spaces", () => {
    expect(parsePs(fixture("ps.txt")).get(8598)?.command).toBe("MSTeams");
    expect(parsePs(fixture("ps.txt")).get(8598)?.path).toBe("/Applications/Microsoft Teams.app/Contents/MacOS/MSTeams");
  });
});

describe("readProcesses", () => {
  const exited = (stdout: string) => Object.assign(new Error("Command failed"), { code: 1, stdout });

  it("looks the pids up with ps", async () => {
    let args: string[] = [];
    const runner: Runner = async (_cmd, a) => {
      args = a;
      return "  891     1 01:00:00   0:10.00 me /usr/bin/caffeinate\n";
    };
    const info = await readProcesses([891, 892], runner);
    expect(args).toEqual(["-o", "pid=,ppid=,etime=,time=,user=,comm=", "-p", "891,892"]);
    expect(info.get(891)?.command).toBe("caffeinate");
  });

  it("returns no rows, not an error, when every pid has already exited", async () => {
    // ps -p exits 1 with empty output when none of the pids exists.
    const runner: Runner = async () => {
      throw exited("");
    };
    expect((await readProcesses([99998], runner)).size).toBe(0);
  });

  it("still fails on a real ps error", async () => {
    const runner: Runner = async () => {
      throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
    };
    await expect(readProcesses([1], runner)).rejects.toThrow("timeout");
  });
});

describe("commandEnv", () => {
  it("keeps numbers and messages in the C locale but text in UTF-8, so ps does not escape non-ASCII names", () => {
    // Under LC_ALL=C, ps prints "Çalışma.app" as "M-CM^GalM-DM-1M-EM^_ma.app".
    // A Turkish LC_NUMERIC alone would make top print "12,5".
    const env = commandEnv({ LC_ALL: "tr_TR.UTF-8", LC_NUMERIC: "tr_TR.UTF-8", LANG: "tr_TR.UTF-8", PATH: "/usr/bin" });
    expect(env).toEqual({ LANG: "C", LC_CTYPE: "UTF-8", PATH: "/usr/bin" });
  });
});
