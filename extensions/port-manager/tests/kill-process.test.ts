import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCommand } from "../src/utilities/runCommand";
import {
  forceKill,
  getPidsByName,
  isRunning,
  kill,
  killall,
  killProcess,
  killSurvivor,
  KillSignal,
  ProcessGoneError,
  ProcessReplacedError,
  ProcessSurvivedError,
  processFingerprint,
  resolveKillSignal,
  waitForExit,
} from "../src/utilities/killProcess";

vi.mock("../src/utilities/runCommand", () => ({ runCommand: vi.fn() }));
vi.mock("../src/utilities/platform", () => ({
  get isWindows() {
    return process.platform === "win32";
  },
}));
const command = vi.mocked(runCommand);
const gone = () => {
  throw Object.assign(new Error("gone"), { code: "ESRCH" });
};

beforeEach(() => {
  vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
  command.mockReset().mockResolvedValue({ stdout: "", stderr: "" });
  // No test sends a real signal to a host process.
  vi.spyOn(process, "kill").mockImplementation(gone);
});
afterEach(() => vi.useRealTimers());

describe("process termination", () => {
  it("treats permission-denied processes as alive and missing processes as exited", () => {
    expect(isRunning(42)).toBe(false);
    vi.mocked(process.kill).mockImplementation(() => {
      throw Object.assign(new Error("denied"), { code: "EPERM" });
    });
    expect(isRunning(42)).toBe(true);
    vi.mocked(process.kill).mockReturnValue(true);
    expect(isRunning(42)).toBe(true);
  });
  it("polls multiple PIDs against a shared deadline", async () => {
    vi.useFakeTimers();
    vi.mocked(process.kill).mockImplementation((pid) => {
      if (pid === 43) return gone();
      return true;
    });
    const result = waitForExit([42, 43]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await result).toEqual([42]);
    expect(process.kill).toHaveBeenCalledTimes(10);
  });
  it("stops polling once the process exits", async () => {
    vi.useFakeTimers();
    vi.mocked(process.kill).mockReturnValueOnce(true);
    const result = waitForExit(42);
    await vi.advanceTimersByTimeAsync(125);
    expect(await result).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(["ask", "", "invalid", "9", "15"])("resolves kill preference %s", (preference) => {
    expect(resolveKillSignal(preference)).toBe(preference === "9" ? "9" : "15");
  });
  it("passes macOS PID and name arguments without shell interpolation", async () => {
    await kill([42, 43], KillSignal.TERM);
    await killall(["My App", "name;echo unsafe"], KillSignal.KILL);
    expect(command).toHaveBeenCalledWith("/bin/kill", ["-15", "42", "43"], { timeout: 2000 });
    expect(command).toHaveBeenCalledWith("/usr/bin/killall", ["-9", "My App", "name;echo unsafe"], { timeout: 5000 });
  });
  it("uses taskkill on Windows and skips Unix fingerprints", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    await kill([42, 43], KillSignal.TERM);
    await killall("node.exe", KillSignal.KILL);
    expect(command).toHaveBeenCalledWith("taskkill.exe", ["/PID", "42", "/F"], { timeout: 2000 });
    expect(command).toHaveBeenCalledWith("taskkill.exe", ["/PID", "43", "/F"], { timeout: 2000 });
    expect(command).toHaveBeenCalledWith("taskkill.exe", ["/IM", "node.exe", "/F"], { timeout: 5000 });
    expect(await processFingerprint(42)).toBeUndefined();
  });
  it("normalizes fingerprints and tolerates unavailable start times", async () => {
    command.mockResolvedValueOnce({ stdout: " Sun   Oct 4 12:00:00 2026\n", stderr: "" });
    expect(await processFingerprint(42)).toBe("Sun Oct 4 12:00:00 2026");
    expect(await processFingerprint(42)).toBeUndefined();
    command.mockRejectedValueOnce(new Error("denied"));
    expect(await processFingerprint(42)).toBeUndefined();
  });
  it("refuses to kill a missing or reused PID", async () => {
    await expect(killSurvivor({ pid: 42 }, KillSignal.KILL)).rejects.toBeInstanceOf(ProcessGoneError);
    vi.mocked(process.kill).mockReturnValue(true);
    command.mockResolvedValueOnce({ stdout: "new start time", stderr: "" });
    await expect(killSurvivor({ pid: 42, startedAt: "original start time" }, KillSignal.KILL)).rejects.toBeInstanceOf(
      ProcessReplacedError,
    );
    expect(command.mock.calls.every(([file]) => file === "/bin/ps")).toBe(true);
  });
  it("force kills the same process and verifies its exit", async () => {
    vi.mocked(process.kill).mockReturnValueOnce(true);
    command.mockResolvedValueOnce({ stdout: "original", stderr: "" });
    const onKilled = vi.fn();
    const onError = vi.fn();
    await forceKill({ pid: 42, startedAt: "original" }, { onKilled, onError });
    expect(command).toHaveBeenCalledWith("/bin/kill", ["-9", "42"], { timeout: 2000 });
    expect(onKilled).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });
  it("reports force-kill survivors through onError", async () => {
    vi.useFakeTimers();
    vi.mocked(process.kill).mockReturnValue(true);
    const onError = vi.fn();
    const result = forceKill({ pid: 42 }, { onError });
    await vi.advanceTimersByTimeAsync(1000);
    await result;
    expect(onError).toHaveBeenCalledWith(expect.any(ProcessSurvivedError));
  });
  it("kills the selected process or parent and reports success after exit", async () => {
    const onKilled = vi.fn();
    await killProcess({ pid: 42 }, { onKilled });
    await killProcess({ pid: 42, parentPid: 7 }, { killParent: true, onKilled });
    expect(command).toHaveBeenCalledWith("/bin/kill", ["-15", "42"], { timeout: 2000 });
    expect(command).toHaveBeenCalledWith("/bin/kill", ["-15", "7"], { timeout: 2000 });
    expect(onKilled).toHaveBeenCalledTimes(2);
  });
  it("rejects missing kill-all names and parent PIDs through onError", async () => {
    const onError = vi.fn();
    await killProcess({ pid: 42 }, { killAll: true, onError });
    await killProcess({ pid: 42 }, { killParent: true, onError });
    expect(onError).toHaveBeenCalledTimes(2);
    expect(command).not.toHaveBeenCalled();
  });
  it("kills all processes by name and forwards command errors", async () => {
    const onKilled = vi.fn();
    await killProcess({ pid: 42, name: "node" }, { killAll: true, onKilled });
    expect(command).toHaveBeenCalledWith("/usr/bin/killall", ["-15", "node"], { timeout: 5000 });
    expect(onKilled).toHaveBeenCalledOnce();
    const error = new Error("denied");
    command.mockRejectedValueOnce(error);
    const onError = vi.fn();
    await killProcess({ pid: 42 }, { onError });
    expect(onError).toHaveBeenCalledWith(error);
  });
  it.each([true, false])("reports a surviving process, survivor callback=%s", async (withCallback) => {
    vi.useFakeTimers();
    vi.mocked(process.kill).mockReturnValue(true);
    command.mockResolvedValue({ stdout: "original", stderr: "" });
    const onSurvived = vi.fn();
    const onError = vi.fn();
    const onKilled = vi.fn();
    const result = killProcess({ pid: 42 }, { onKilled, onError, onSurvived: withCallback ? onSurvived : undefined });
    await vi.advanceTimersByTimeAsync(1000);
    await result;
    expect(onKilled).not.toHaveBeenCalled();
    if (withCallback) expect(onSurvived).toHaveBeenCalledWith({ pid: 42, startedAt: "original" });
    else expect(onError).toHaveBeenCalledWith(expect.any(ProcessSurvivedError));
  });
  it("finds macOS processes by executable basename", async () => {
    command.mockResolvedValue({
      stdout: "42 /usr/bin/node\n43 /Applications/My App/node\n44 /usr/bin/other\ninvalid",
      stderr: "",
    });
    expect(await getPidsByName("node")).toEqual([42, 43]);
  });
  it.each([true, false])("finds Windows names case-insensitively, array=%s", async (array) => {
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    const entry = { ProcessId: 42, Name: "NODE.EXE" };
    command.mockResolvedValue({
      stdout: "\ufeff" + JSON.stringify(array ? [entry, { ProcessId: 43, Name: "other.exe" }] : entry),
      stderr: "",
    });
    expect(await getPidsByName("node.exe")).toEqual([42]);
  });
});
