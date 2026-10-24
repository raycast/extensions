import { describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { groupAlive, signalGroup, signalPid } from "../lib/proc";

describe("signalGroup tells a gone group from one that isn't ours", () => {
  test("sent while the group lives, gone once it has exited", async () => {
    const child = spawn("/bin/sleep", ["30"], { detached: true, stdio: "ignore" });
    const exited = new Promise((r) => child.on("exit", r));
    const pgid = child.pid!;
    expect(signalGroup(pgid, 0)).toBe("sent");
    expect(groupAlive(pgid)).toBe(true);
    expect(signalGroup(pgid, "SIGKILL")).toBe("sent");
    await exited;
    expect(signalGroup(pgid, 0)).toBe("gone");
    expect(groupAlive(pgid)).toBe(false);
  });

  // EPERM means the group exists: read as gone, a caller would stop waiting on a live group.
  test("another user's group is denied, and still counts as alive", () => {
    const rows = spawnSync("/bin/ps", ["-axo", "pid=,pgid=,user="], { encoding: "utf8" }).stdout;
    const root = rows
      .split("\n")
      .map((l) => l.trim().split(/\s+/))
      .find(([pid, pgid, user]) => user === "root" && pid === pgid && Number(pid) > 1);
    expect(root ? "found" : "no root-owned group leader to probe").toBe("found");
    expect(signalGroup(Number(root![0]), 0)).toBe("denied");
    expect(groupAlive(Number(root![0]))).toBe(true);
  });

  test("0, 1, negative and fractional ids are refused before any kill", () => {
    for (const bad of [0, 1, -5, 1.5, NaN]) {
      expect(() => signalGroup(bad, 0)).toThrow(/not a process or group id/);
      expect(() => signalPid(bad, 0)).toThrow(/not a process or group id/);
    }
  });

  test("signalPid reads one process the same way: sent, gone, denied", async () => {
    const child = spawn("/bin/sleep", ["30"], { stdio: "ignore" });
    const exited = new Promise((r) => child.on("exit", r));
    expect(signalPid(child.pid!, 0)).toBe("sent");
    child.kill("SIGKILL");
    await exited;
    expect(signalPid(child.pid!, 0)).toBe("gone");
    const launchdChild = spawnSync("/bin/ps", ["-axo", "pid=,user="], { encoding: "utf8" })
      .stdout.split("\n")
      .map((l) => l.trim().split(/\s+/))
      .find(([pid, user]) => user === "root" && Number(pid) > 1);
    expect(signalPid(Number(launchdChild![0]), 0)).toBe("denied");
  });
});
