import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Runner } from "../src/collectors/exec";
import { collectSnapshot, hasProcessSample, mergeSnapshot } from "../src/collectors/snapshot";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

const outputs: Record<string, string> = {
  "/usr/sbin/ioreg": fixture("ioreg-battery.txt"),
  "/usr/bin/pmset -g batt": fixture("pmset-batt-battery.txt"),
  "/usr/bin/pmset -g assertions": fixture("assertions.txt"),
  "/usr/bin/top": fixture("top.txt"),
  "/bin/ps": fixture("ps.txt"),
};

function fakeRunner(failing: string[] = [], overrides: Record<string, string> = {}): Runner {
  return async (cmd, args) => {
    const key = cmd === "/usr/bin/pmset" ? `${cmd} ${args.join(" ")}` : cmd;
    if (failing.includes(key)) throw new Error("timeout");
    return overrides[key] ?? outputs[key] ?? "";
  };
}

describe("collectSnapshot", () => {
  it("combines every collector", async () => {
    const s = await collectSnapshot(fakeRunner(), 1000);
    expect(s.t).toBe(1000);
    expect(s.battery.systemLoadW).toBeCloseTo(3.422);
    expect(s.source?.source).toBe("battery");
    expect(s.processes[0].command).toBe("zsh");
    expect(s.processInfo.get(10449)?.user).toBe("johndoe");
    expect(s.blockers.map((b) => b.process)).toEqual(["caffeinate", "sharingd", "zoom.us"]);
    expect(s.errors).toEqual([]);
  });

  it("keeps the other collectors when one fails", async () => {
    const s = await collectSnapshot(fakeRunner(["/usr/bin/top"]), 1000);
    expect(s.processes).toEqual([]);
    expect(s.blockers).toHaveLength(3); // still looked up with ps, independent of top
    expect(s.battery.percent).toBe(46);
    expect(s.errors).toEqual(["top: timeout"]);
  });

  it("survives a Mac without battery telemetry", async () => {
    const s = await collectSnapshot(async () => "", 1000);
    expect(s.battery.systemLoadW).toBeUndefined();
    expect(s.source).toBeUndefined();
    expect(s.errors).toEqual([]);
  });

  it("sorts processes by energy impact, since top's own order is not strict", async () => {
    const top = `PID    POWER %CPU COMMAND\n1    1.7   1.7  a\n2    1.8   1.8  b\n3    9.0   9.0  c\n`;
    const s = await collectSnapshot(fakeRunner([], { "/usr/bin/top": top, "/bin/ps": "" }), 1000);
    expect(s.processes.map((p) => p.command)).toEqual(["c", "b", "a"]);
  });

  it("looks up sleep blockers and the processes that started them", async () => {
    const table: Record<number, string> = {
      10449: "10449  4620 22:12:22 1321:02.22 johndoe -zsh",
      96416: "96416 96413    00:05    0:00.00 johndoe caffeinate",
      96413: "96413 61902    00:05    0:00.02 johndoe /bin/zsh",
      61902: "61902  4620    40:44    2:08.54 johndoe /opt/homebrew/bin/claude",
      4620: " 4620     1 23:38:44    0:01.00 johndoe -zsh",
    };
    const psCalls: number[][] = [];
    const runner: Runner = async (cmd, args) => {
      if (cmd === "/bin/ps") {
        const pids = args[args.length - 1].split(",").map(Number);
        psCalls.push(pids);
        return pids.map((pid) => table[pid] ?? "").join("\n");
      }
      if (cmd === "/usr/bin/pmset" && args[1] === "assertions") {
        return '   pid 96416(caffeinate): [0x0001] 00:00:05 PreventUserIdleSystemSleep named: "caffeinate command-line tool"\n';
      }
      if (cmd === "/usr/bin/top") return "PID    POWER %CPU COMMAND\n10449  99.1  99.1 zsh\n";
      return "";
    };

    const s = await collectSnapshot(runner, 1000);
    expect(psCalls[0].sort()).toEqual([10449, 96416].sort());
    expect(s.processInfo.get(96416)?.ppid).toBe(96413);
    expect(s.processInfo.get(61902)?.command).toBe("claude");
    expect(psCalls.length).toBeLessThanOrEqual(4);
  });

  it("does not report a failed data source when a blocker's parent exits before its lookup", async () => {
    const runner: Runner = async (cmd, args) => {
      if (cmd === "/bin/ps") {
        const pids = args[args.length - 1];
        // The blocker is found, but its parent (pid 96413) has already exited: ps exits 1 with no output.
        if (pids === "96413") throw Object.assign(new Error("Command failed"), { code: 1, stdout: "" });
        return "96416 96413    00:05    0:00.00 johndoe caffeinate\n";
      }
      if (cmd === "/usr/bin/pmset" && args[1] === "assertions") {
        return '   pid 96416(caffeinate): [0x0001] 00:00:05 PreventUserIdleSystemSleep named: "caffeinate command-line tool"\n';
      }
      return "";
    };
    const s = await collectSnapshot(runner, 1000);
    expect(s.errors).toEqual([]);
    expect(s.blockers).toHaveLength(1);
  });

  it("replaces top's 16-character names with the full executable name from ps", async () => {
    const top = "PID    POWER %CPU COMMAND\n891    3.2   3.2  Example Sync Ser\n";
    const ps =
      "  891     1 01:00:00   0:10.00 johndoe /Applications/Example Sync Service.app/Contents/MacOS/Example Sync Service\n";
    const s = await collectSnapshot(fakeRunner([], { "/usr/bin/top": top, "/bin/ps": ps }), 1000);
    expect(s.processes[0].command).toBe("Example Sync Service");
  });

  it("keeps top's name when ps reports an unrelated command-line name", async () => {
    const top = "PID    POWER %CPU COMMAND\n555    3.0   3.0  node\n";
    const ps = "  555     1 01:00:00   0:10.00 johndoe npm exec @playwright/mcp@latest\n";
    const s = await collectSnapshot(fakeRunner([], { "/usr/bin/top": top, "/bin/ps": ps }), 1000);
    expect(s.processes[0].command).toBe("node");
  });

  it("uses the real name when top shows a version number as the process title", async () => {
    // Claude Code sets its title to its version; top shows "2.1.280", ps shows the executable.
    const top = "PID    POWER %CPU COMMAND\n61902  5.0   5.0  2.1.280\n";
    const ps = "61902 61328    40:44    2:08.54 johndoe claude\n";
    const s = await collectSnapshot(fakeRunner([], { "/usr/bin/top": top, "/bin/ps": ps }), 1000);
    expect(s.processes[0].command).toBe("claude");
  });

  it("samples the top 50 processes so apps can add up their helpers", async () => {
    let topArgs: string[] = [];
    const runner: Runner = async (cmd, args) => {
      if (cmd === "/usr/bin/top") topArgs = args;
      return "";
    };
    await collectSnapshot(runner, 1000);
    expect(topArgs[topArgs.indexOf("-n") + 1]).toBe("50");
  });

  describe("with SMC", () => {
    it("shows the live system draw from SMC over ioreg's once-a-minute one", async () => {
      const s = await collectSnapshot(fakeRunner(), 1000, { smc: async () => ({ PSTR: 8.2 }) });
      expect(s.battery.systemLoadW).toBe(8.2);
      expect(s.battery.systemLoadLive).toBe(true);
    });

    it("asks SMC for the system and adapter keys only", async () => {
      let asked: string[] = [];
      await collectSnapshot(fakeRunner(), 1000, {
        smc: async (keys) => {
          asked = keys;
          return {};
        },
      });
      expect(asked).toEqual(["PSTR", "PDTR", "PD0R"]);
    });

    it("falls back to ioreg without a warning when SMC fails, since ioreg still has the data", async () => {
      const s = await collectSnapshot(fakeRunner(), 1000, {
        smc: async () => {
          throw new Error("helper missing");
        },
      });
      expect(s.battery.systemLoadW).toBeCloseTo(3.422);
      expect(s.battery.systemLoadLive).toBeUndefined();
      expect(s.errors).toEqual([]);
    });

    it("gives a desktop Mac, which has no battery, its system draw", async () => {
      const s = await collectSnapshot(async () => "", 1000, { smc: async () => ({ PSTR: 21 }) });
      expect(s.battery.systemLoadW).toBe(21);
    });
  });

  it("dates its processes by the poll that collected them", async () => {
    expect((await collectSnapshot(fakeRunner(), 1000)).processesAt).toBe(1000);
  });

  describe("a power-only poll", () => {
    it("skips top, ps and the sleep-blocker lookup, which cost the most", async () => {
      const called: string[] = [];
      const runner: Runner = async (cmd, args) => {
        called.push(cmd === "/usr/bin/pmset" ? `${cmd} ${args.join(" ")}` : cmd);
        return fakeRunner()(cmd, args);
      };
      const s = await collectSnapshot(runner, 1000, { processes: false });
      expect(called.sort()).toEqual(["/usr/bin/pmset -g batt", "/usr/sbin/ioreg"]);
      expect(s.partial).toBe(true);
      expect(s.battery.percent).toBe(46);
    });
  });

  describe("mergeSnapshot", () => {
    it("keeps the last processes and blockers under a power-only poll's fresh power readings", async () => {
      const full = await collectSnapshot(fakeRunner(), 1000);
      const light = await collectSnapshot(fakeRunner(), 6000, { processes: false, smc: async () => ({ PSTR: 9 }) });
      const merged = mergeSnapshot(full, light);
      expect(merged.t).toBe(6000);
      expect(merged.battery.systemLoadW).toBe(9);
      expect(merged.processes).toBe(full.processes);
      expect(merged.processInfo).toBe(full.processInfo);
      expect(merged.blockers).toBe(full.blockers);
      expect(merged.partial).toBeUndefined();
      // Charts drawn from the processes stay at the full poll's time, so they only redraw every 15 s.
      expect(merged.processesAt).toBe(1000);
    });

    it("keeps the last failures of the collectors a power-only poll skipped", async () => {
      const full = await collectSnapshot(fakeRunner(["/usr/bin/top", "/usr/sbin/ioreg"]), 1000);
      const light = await collectSnapshot(fakeRunner(), 6000, { processes: false });
      expect(mergeSnapshot(full, light).errors).toEqual(["top: timeout"]);
    });

    it("keeps the last process list when a full poll's top failed, instead of emptying it", async () => {
      const full = await collectSnapshot(fakeRunner(), 1000);
      const failed = await collectSnapshot(fakeRunner(["/usr/bin/top"]), 16000);
      const merged = mergeSnapshot(full, failed);
      expect(merged.processes).toBe(full.processes);
      expect(merged.processesAt).toBe(1000);
      expect(merged.errors).toEqual(["top: timeout"]);
    });

    it("takes a full poll as it is", async () => {
      const first = await collectSnapshot(fakeRunner(), 1000);
      const second = await collectSnapshot(fakeRunner(), 6000);
      expect(mergeSnapshot(first, second)).toBe(second);
      expect(mergeSnapshot(undefined, second)).toBe(second);
    });
  });

  it("drops its own short-lived top process", async () => {
    const top = `${fixture("top.txt").trimEnd()}\n80315  9.2   9.2  top\n`;
    const s = await collectSnapshot(fakeRunner([], { "/usr/bin/top": top }), 1000);
    expect(s.processes.some((p) => p.command === "top")).toBe(false);
    expect(s.processes).toHaveLength(6);
  });
});

describe("hasProcessSample", () => {
  it("is a real process sample when top ran and succeeded", async () => {
    expect(hasProcessSample(await collectSnapshot(fakeRunner(), 1000))).toBe(true);
  });

  it("is not a sample when top failed: its empty list would read as every process having stopped", async () => {
    expect(hasProcessSample(await collectSnapshot(fakeRunner(["/usr/bin/top"]), 1000))).toBe(false);
  });

  it("is not a sample for a power-only poll, which does not collect processes", async () => {
    expect(hasProcessSample(await collectSnapshot(fakeRunner(), 1000, { processes: false }))).toBe(false);
  });
});
