import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPreferenceValues } from "@raycast/api";
import Process from "../src/models/Process";
import { getPidsByName, kill, killall, waitForExit } from "../src/utilities/killProcess";
import { CommandExitError } from "../src/utilities/runCommand";
import killPort, { confirmation as portConfirmation } from "../src/tools/kill-process-on-port";
import killOpenPort, { confirmation as processConfirmation } from "../src/tools/kill-open-port-process";
import list from "../src/tools/list-open-ports";

vi.mock("../src/models/Process", () => ({ default: { getCurrent: vi.fn(), getListeningPids: vi.fn() } }));
vi.mock("../src/utilities/killProcess", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/utilities/killProcess")>()),
  kill: vi.fn(),
  killall: vi.fn(),
  waitForExit: vi.fn(),
  getPidsByName: vi.fn(),
}));
vi.mock("../src/utilities/platform", () => ({
  get isWindows() {
    return process.platform === "win32";
  },
}));

beforeEach(() => {
  vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
  vi.mocked(Process.getCurrent)
    .mockReset()
    .mockResolvedValue([
      {
        pid: 42,
        name: "node",
        parentPid: 7,
        commandLine: "node server.js",
        portInfo: [
          { host: "127.0.0.1", port: 3000, name: "Dev" },
          { host: "*", port: 80 },
        ],
      } as Process,
    ]);
  vi.mocked(Process.getListeningPids).mockReset().mockResolvedValue(["42", "42", "43"]);
  vi.mocked(waitForExit).mockReset().mockResolvedValue([]);
  vi.mocked(getPidsByName).mockReset().mockResolvedValue([42, 43]);
  vi.mocked(kill).mockReset().mockResolvedValue(undefined);
  vi.mocked(killall).mockReset().mockResolvedValue(undefined);
  vi.mocked(getPreferenceValues).mockReturnValue({ killSignal: "ask" });
});

describe("list open ports tool", () => {
  it("returns process details and filters individual ports by exposure and number", async () => {
    expect(JSON.parse(await list({ port: 3000, exposure: "loopback" }))).toEqual([
      {
        pid: 42,
        name: "node",
        parentPid: 7,
        commandLine: "node server.js",
        ports: [{ host: "127.0.0.1", port: 3000, name: "Dev", exposure: "loopback" }],
      },
    ]);
    expect(JSON.parse(await list({}))[0].ports).toHaveLength(2);
    expect(await list({ port: 3000, exposure: "all-interfaces" })).toBe("No matching TCP listeners were found.");
  });
  it("rejects invalid ports before discovery", async () => {
    expect(await list({ port: 65536 })).toContain("integer between 0 and 65535");
    expect(Process.getCurrent).not.toHaveBeenCalled();
  });
  it("omits processes without listeners", async () => {
    vi.mocked(Process.getCurrent).mockResolvedValue([{ pid: 42 } as Process]);
    expect(await list({})).toBe("No matching TCP listeners were found.");
  });
});

describe("kill by port tool", () => {
  it.each([0, -1, 65536, 1.5, NaN])("rejects invalid port %s before discovery", async (port) => {
    expect(await killPort({ port })).toContain("integer between 1 and 65535");
    expect(Process.getListeningPids).not.toHaveBeenCalled();
    expect(kill).not.toHaveBeenCalled();
  });
  it("deduplicates PIDs, uses the preference, and verifies termination", async () => {
    expect(await killPort({ port: 3000 })).toBe("Killed process 42, 43 listening on port 3000.");
    expect(kill).toHaveBeenCalledWith([42, 43], "15");
    expect(waitForExit).toHaveBeenCalledWith([42, 43]);
    expect(await portConfirmation({ port: 3000 })).toEqual({
      style: "destructive",
      message: "Kill the process listening on port 3000?",
    });
  });
  it("treats lsof's empty exit 1 as no listener but propagates other failures", async () => {
    vi.mocked(Process.getListeningPids).mockRejectedValueOnce(new CommandExitError("lsof", [], "", "", 1, null));
    expect(await killPort({ port: 3000 })).toBe("No process is listening on port 3000.");
    expect(kill).not.toHaveBeenCalled();
    vi.mocked(Process.getListeningPids).mockRejectedValueOnce(new CommandExitError("lsof", [], "", "denied", 1, null));
    await expect(killPort({ port: 3000 })).rejects.toThrow("denied");
  });
  it.each(["15", "9"])("reports survivors for signal %s", async (signal) => {
    vi.mocked(getPreferenceValues).mockReturnValue({ killSignal: signal });
    vi.mocked(waitForExit).mockResolvedValue([42]);
    expect(await killPort({ port: 3000 })).toBe(
      `${signal === "9" ? "SIGKILL" : "SIGTERM"} was sent to port 3000, but process 42 is still running.`,
    );
  });
  it("reports Windows survivors with taskkill", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    vi.mocked(waitForExit).mockResolvedValue([42]);
    expect(await killPort({ port: 3000 })).toContain("with taskkill, but process 42 is still running");
  });
});

describe("kill open port process tool", () => {
  it.each([0, -1, 1.5])("rejects invalid PID %s", async (pid) => {
    expect(await killOpenPort({ pid, target: "process" })).toBe("The PID must be a positive integer.");
    expect(Process.getCurrent).not.toHaveBeenCalled();
  });
  it("refuses stale listener PIDs", async () => {
    expect(await killOpenPort({ pid: 99, target: "process" })).toBe("Process 99 is not listening on an open TCP port.");
    expect(kill).not.toHaveBeenCalled();
  });
  it.each(["process", "parent"] as const)("kills target %s with an explicit signal", async (target) => {
    const pid = target === "parent" ? 7 : 42;
    expect(await killOpenPort({ pid: 42, target, signal: "kill" })).toBe(
      `Killed ${target === "parent" ? "parent " : ""}process ${pid}.`,
    );
    expect(kill).toHaveBeenCalledWith(pid, "9");
    expect(waitForExit).toHaveBeenCalledWith(pid);
    expect((await processConfirmation({ pid: 42, target }))?.style).toBe("destructive");
  });
  it.each([undefined, 0, 1])("refuses protected or missing macOS parent %s", async (parentPid) => {
    vi.mocked(Process.getCurrent).mockResolvedValue([{ pid: 42, parentPid } as Process]);
    expect(await killOpenPort({ pid: 42, target: "parent" })).toBe("Process 42 has no parent that can be killed.");
    expect(kill).not.toHaveBeenCalled();
  });
  it("refuses the Windows system parent PID", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    vi.mocked(Process.getCurrent).mockResolvedValue([{ pid: 42, parentPid: 4 } as Process]);
    expect(await killOpenPort({ pid: 42, target: "parent" })).toBe("Process 42 has no parent that can be killed.");
    expect(kill).not.toHaveBeenCalled();
  });
  it("reports survivors instead of success", async () => {
    vi.mocked(waitForExit).mockResolvedValue([42]);
    expect(await killOpenPort({ pid: 42, target: "process", signal: "term" })).toBe(
      "Process 42 is still running after the termination request.",
    );
    expect(kill).toHaveBeenCalledWith(42, "15");
  });
  it("kills all by name and checks every matching PID", async () => {
    expect(await killOpenPort({ pid: 42, target: "all" })).toBe('Killed processes 42, 43 named "node".');
    expect(killall).toHaveBeenCalledWith("node", "15");
    expect(waitForExit).toHaveBeenCalledWith([42, 43]);
    vi.mocked(waitForExit).mockResolvedValue([43]);
    expect(await killOpenPort({ pid: 42, target: "all" })).toContain("process 43 is still running");
    expect((await processConfirmation({ pid: 42, target: "all" }))?.message).toContain("sharing the name");
  });
  it("refuses kill-all without a name", async () => {
    vi.mocked(Process.getCurrent).mockResolvedValue([{ pid: 42 } as Process]);
    expect(await killOpenPort({ pid: 42, target: "all" })).toBe("Process 42 has no name to use for Kill All.");
    expect(killall).not.toHaveBeenCalled();
  });
  it("reports incomplete verification when the name lookup fails", async () => {
    vi.mocked(getPidsByName).mockRejectedValue(new Error("denied"));
    expect(await killOpenPort({ pid: 42, target: "all" })).toContain("Other matching processes may still be running.");
    expect(waitForExit).toHaveBeenCalledWith([42]);
    vi.mocked(waitForExit).mockResolvedValue([42]);
    expect(await killOpenPort({ pid: 42, target: "all" })).toContain("process 42 is still running");
  });
});
