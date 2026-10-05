import { beforeEach, describe, expect, it, vi } from "vitest";
import Process from "../src/models/Process";
import { runCommand } from "../src/utilities/runCommand";
import { cache } from "./setup";

vi.mock("../src/utilities/runCommand", () => ({ runCommand: vi.fn() }));
const command = vi.mocked(runCommand);
const header = "Proto Recv-Q Send-Q Local Address Foreign Address (state) rxbytes txbytes rhiwat shiwat pid";
const macListeners = `${header}\ntcp4 0 0 127.0.0.1.3000 *.* LISTEN 0 0 0 0 42\ntcp6 0 0 127.0.0.1.3000 *.* LISTEN 0 0 0 0 42\ntcp6 0 0 ::1.3001 *.* LISTEN 0 0 0 0 42\ntcp4 0 0 127.0.0.1.9000 *.* ESTABLISHED 0 0 0 0 99\ntcp4 0 0 *.80 *.* LISTEN 0 0 0 0 0\ntcp4 0 0 malformed *.* LISTEN 0 0 0 0 50`;
const windowsListeners =
  "TCP 127.0.0.1:3000 0.0.0.0:0 LISTENING 42\nTCP [::1]:3001 [::]:0 LISTENING 42\nTCP 127.0.0.1:9000 10.0.0.1:80 ESTABLISHED 99\nUDP 0.0.0.0:80 *:* 20\nTCP 0.0.0.0:80 0.0.0.0:0 LISTENING 0\nTCP malformed 0.0.0.0:0 LISTENING 50";

beforeEach(() => {
  command.mockReset();
  cache.set("named-ports", JSON.stringify({ 3000: { name: "Dev" } }));
});

describe("macOS listener discovery", () => {
  beforeEach(() => {
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
    command.mockImplementation(async (file, args) => {
      if (file.includes("netstat")) return { stdout: macListeners, stderr: "" };
      if (args.includes("command="))
        return { stdout: "42 /Applications/My App/node server.js --flag\nmalformed", stderr: "" };
      return {
        stdout: args.includes("42")
          ? "42 7 501 alice /Applications/My App/node\nmalformed"
          : "7 1 501 alice /bin/parent",
        stderr: "",
      };
    });
  });
  it("groups listeners, deduplicates sockets, and enriches names and parent details", async () => {
    const processes = await Process.getCurrent();
    expect(processes).toHaveLength(1);
    expect(processes[0]).toMatchObject({
      pid: 42,
      name: "node",
      parentPid: 7,
      user: "alice",
      uid: 501,
      path: "/Applications/My App/node",
      parentPath: "/bin/parent",
      commandLine: "/Applications/My App/node server.js --flag",
      portInfo: [
        { host: "127.0.0.1", port: 3000, name: "Dev" },
        { host: "::1", port: 3001 },
      ],
    });
  });
  it("shares an in-flight request and reloads after completion", async () => {
    const [first, second] = await Promise.all([Process.getCurrent(), Process.getCurrent()]);
    expect(first).toBe(second);
    expect(command.mock.calls.filter(([file]) => file.includes("netstat"))).toHaveLength(1);
    await Process.getCurrent();
    expect(command.mock.calls.filter(([file]) => file.includes("netstat"))).toHaveLength(2);
  });
  it.each(["failure", "empty", "unrecognized header"])("falls back to lsof after netstat %s", async (scenario) => {
    command.mockImplementation(async (file) => {
      if (file.includes("netstat")) {
        if (scenario === "failure") throw new Error("netstat failed");
        return { stdout: scenario === "empty" ? header : "unknown header", stderr: "" };
      }
      if (file.includes("lsof"))
        return {
          stdout:
            "p42\ncnode\nR7\nu501\nLalice\nPTCP\ntIPv6\nn[::1]:3000\nninvalid\nn*:bad\np43\ncother\nn*:80\np0\ncignored",
          stderr: "",
        };
      throw new Error("details unavailable");
    });
    expect(await Process.getCurrent()).toMatchObject([
      {
        pid: 42,
        name: "node",
        parentPid: 7,
        uid: 501,
        user: "alice",
        protocol: "TCP",
        internetProtocol: "IPv6",
        portInfo: [{ host: "[::1]", port: 3000, name: "Dev" }],
      },
      { pid: 43, name: "other", portInfo: [{ host: "*", port: 80 }] },
    ]);
  });
  it("keeps process details if the supplementary command-line query fails", async () => {
    command.mockImplementation(async (file, args) => {
      if (file.includes("netstat")) return { stdout: macListeners, stderr: "" };
      if (args.includes("command=")) throw new Error("permission denied");
      return { stdout: "42 7 501 alice /bin/node", stderr: "" };
    });
    expect((await Process.getCurrent())[0]).toMatchObject({ name: "node", path: "/bin/node", commandLine: undefined });
  });
  it("returns whitespace-separated listening PIDs", async () => {
    command.mockResolvedValue({ stdout: "42\n43\n", stderr: "" });
    expect(await Process.getListeningPids("3000")).toEqual(["42", "43"]);
    expect(command).toHaveBeenCalledWith(
      "/usr/sbin/lsof",
      ["-n", "-iTCP:3000", "-sTCP:LISTEN", "-t"],
      expect.any(Object),
    );
  });
});

describe("Windows listener discovery", () => {
  beforeEach(() => vi.spyOn(process, "platform", "get").mockReturnValue("win32"));
  it.each([true, false])("parses localized netstat and PowerShell JSON, array=%s", async (array) => {
    command.mockImplementation(async (file, args) => {
      if (file === "netstat.exe") return { stdout: windowsListeners.replace(/LISTENING/g, "ABHÖREN"), stderr: "" };
      const entry = args.join(" ").includes("ProcessId = 42")
        ? {
            ProcessId: 42,
            ParentProcessId: 7,
            Name: "node.exe",
            ExecutablePath: "C:\\node.exe",
            CommandLine: "node server.js",
          }
        : { ProcessId: 7, ParentProcessId: 4, Name: "parent.exe", ExecutablePath: "C:\\parent.exe" };
      return { stdout: "\ufeff" + JSON.stringify(array ? [entry, null, { ProcessId: -1 }] : entry), stderr: "" };
    });
    expect(await Process.getCurrent()).toMatchObject([
      {
        pid: 42,
        name: "node.exe",
        parentPid: 7,
        path: "C:\\node.exe",
        parentPath: "C:\\parent.exe",
        commandLine: "node server.js",
        portInfo: [
          { host: "127.0.0.1", port: 3000, name: "Dev" },
          { host: "[::1]", port: 3001 },
        ],
      },
    ]);
  });
  it("retains listeners when process detail JSON is invalid", async () => {
    command.mockImplementation(async (file) => ({
      stdout: file === "netstat.exe" ? windowsListeners : "invalid JSON",
      stderr: "",
    }));
    expect(await Process.getCurrent()).toMatchObject([{ pid: 42, name: undefined }]);
  });
  it("does not use lsof for an empty Windows result", async () => {
    command.mockResolvedValue({ stdout: "", stderr: "" });
    expect(await Process.getCurrent()).toEqual([]);
    expect(command).toHaveBeenCalledTimes(1);
  });
  it("propagates netstat failures and permits a subsequent retry", async () => {
    command.mockRejectedValueOnce(new Error("netstat failed"));
    await expect(Process.getCurrent()).rejects.toThrow("netstat failed");
    command.mockResolvedValue({ stdout: "", stderr: "" });
    expect(await Process.getCurrent()).toEqual([]);
  });
  it("filters listening PIDs by the requested port", async () => {
    command.mockResolvedValue({ stdout: windowsListeners, stderr: "" });
    expect(await Process.getListeningPids("3001")).toEqual(["42"]);
    expect(await Process.getListeningPids("9000")).toEqual([]);
  });
});
