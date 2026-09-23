import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";
import { canTerminate, processKind, sameProcess, starterTarget, terminate } from "../src/actions/process";

describe("starterTarget", () => {
  const owner = (user: string) => ({ etimeSec: 1, cpuTimeSec: 0, user, ppid: 1, command: "x", path: "x" });

  const app = (path: string) => ({ ...owner("johndoe"), path });

  it("offers the starter when it is an app the user may terminate", () => {
    expect(
      starterTarget(
        { pid: 700, command: "Amphetamine" },
        app("/Applications/Amphetamine.app/Contents/MacOS/Amphetamine"),
        "johndoe",
      ),
    ).toEqual({ pid: 700, command: "Amphetamine", kind: "app" });
  });

  it("offers a command-line starter too, marked so the dialog can warn it ends a terminal session", () => {
    expect(starterTarget({ pid: 61902, command: "claude" }, app("claude"), "johndoe")).toEqual({
      pid: 61902,
      command: "claude",
      kind: "command-line tool",
    });
  });

  it("offers nothing when the command was typed in a terminal: terminating it would close every session", () => {
    expect(
      starterTarget({ pid: 54084, command: "iTerm", terminal: true }, app("/Applications/iTerm.app"), "johndoe"),
    ).toBeUndefined();
  });

  it("offers nothing for a protected or foreign starter, or none at all", () => {
    expect(starterTarget({ pid: 414, command: "loginwindow" }, owner("johndoe"), "johndoe")).toBeUndefined();
    expect(starterTarget({ pid: 700, command: "sharingd" }, owner("root"), "johndoe")).toBeUndefined();
    expect(starterTarget(undefined, undefined, "johndoe")).toBeUndefined();
  });
});

describe("processKind", () => {
  it("tells an app bundle from a command-line tool by its executable path", () => {
    const at = (path: string) => ({ etimeSec: 1, cpuTimeSec: 0, user: "me", ppid: 1, command: "x", path });
    expect(processKind(at("/Applications/Zoom.app/Contents/MacOS/zoom.us"))).toBe("app");
    expect(processKind(at("/opt/homebrew/bin/claude"))).toBe("command-line tool");
  });
});

describe("sameProcess", () => {
  const seen = { command: "caffeinate", etimeSec: 60 }; // seen at t = 100 s, so started at 40 s

  it("is the same process when name and start time match what the list showed", () => {
    expect(sameProcess(seen, 100_000, { command: "caffeinate", etimeSec: 75 }, 115_000)).toBe(true);
  });

  it("is a different process when the pid was reused by something else", () => {
    expect(sameProcess(seen, 100_000, { command: "Safari", etimeSec: 75 }, 115_000)).toBe(false);
    // Same name, but started 10 s ago: a new caffeinate on the old pid.
    expect(sameProcess(seen, 100_000, { command: "caffeinate", etimeSec: 10 }, 115_000)).toBe(false);
  });

  it("is not the same process when it has exited", () => {
    expect(sameProcess(seen, 100_000, undefined, 115_000)).toBe(false);
  });
});

const info = (user: string) => ({ etimeSec: 100, cpuTimeSec: 90, user });

describe("canTerminate", () => {
  it("allows the current user's own processes", () => {
    expect(canTerminate({ pid: 10449, command: "zsh" }, info("johndoe"), "johndoe")).toBe(true);
  });
  it("refuses other users, protected names and low PIDs", () => {
    expect(canTerminate({ pid: 410, command: "WindowServer" }, info("_windowserver"), "johndoe")).toBe(false);
    expect(canTerminate({ pid: 500, command: "WindowServer" }, info("johndoe"), "johndoe")).toBe(false);
    expect(canTerminate({ pid: 1, command: "launchd" }, info("root"), "root")).toBe(false);
    expect(canTerminate({ pid: 0, command: "kernel_task" }, info("root"), "root")).toBe(false);
  });
  it("refuses loginwindow, which runs as the user but ends the session when killed", () => {
    expect(canTerminate({ pid: 414, command: "loginwindow" }, info("johndoe"), "johndoe")).toBe(false);
  });
  it("refuses the process Battery Drain runs in and its parent", () => {
    expect(canTerminate({ pid: process.pid, command: "node" }, info("me"), "me")).toBe(false);
    expect(canTerminate({ pid: process.ppid, command: "Raycast Backend" }, info("me"), "me")).toBe(false);
  });
  it("refuses when the owner is unknown", () => {
    expect(canTerminate({ pid: 900, command: "x" }, undefined, "johndoe")).toBe(false);
  });
});

function errno(code: string) {
  return Object.assign(new Error(code), { code });
}

describe("terminate", () => {
  const sleep = async () => {};

  it("reports exited once the process is gone", async () => {
    let alive = true;
    const kill = (_pid: number, sig: NodeJS.Signals | 0) => {
      if (sig === 0) {
        if (!alive) throw errno("ESRCH");
        return;
      }
      alive = false;
    };
    expect(await terminate(42, "SIGTERM", { kill, sleep })).toBe("exited");
  });

  it("reports still-running when SIGTERM is ignored", async () => {
    const kill = () => {};
    expect(await terminate(42, "SIGTERM", { kill, sleep })).toBe("still-running");
  });

  it("ends a real process and verifies it is gone", async () => {
    const child = spawn("/bin/sleep", ["60"]);
    const exited = new Promise((r) => child.once("exit", r));
    expect(await terminate(child.pid!, "SIGTERM")).toBe("exited");
    await exited;
  });

  it("counts EPERM after the signal as exited: the pid now belongs to someone else", async () => {
    let signalled = false;
    const kill = (_pid: number, sig: NodeJS.Signals | 0) => {
      if (sig === 0 && signalled) throw errno("EPERM");
      signalled = true;
    };
    expect(await terminate(42, "SIGTERM", { kill, sleep })).toBe("exited");
  });

  it("maps ESRCH and EPERM on send", async () => {
    const missing = () => {
      throw errno("ESRCH");
    };
    const denied = () => {
      throw errno("EPERM");
    };
    expect(await terminate(42, "SIGTERM", { kill: missing, sleep })).toBe("not-found");
    expect(await terminate(42, "SIGKILL", { kill: denied, sleep })).toBe("permission-denied");
  });
});
