import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os, { type UserInfo } from "node:os";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBattery,
  getBootTime,
  installRule,
  isRuleInstalled,
  isSleepDisabled,
  removeRule,
  setSleepDisabled,
} from "../src/lib/system";

// system.ts promisifies execFile at import time, so the mock keeps the same function object and
// answers each call through `execHandler`. Results use the { stdout, stderr } shape that the
// real promisified execFile resolves with.
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  mkdtemp: vi.fn(),
  writeFile: vi.fn(),
  rm: vi.fn(),
}));

vi.mock("node:os", () => {
  const mocked = { userInfo: vi.fn(), tmpdir: vi.fn() };
  return { ...mocked, default: mocked };
});

const PMSET = "/usr/bin/pmset";
const SUDO = "/usr/bin/sudo";
const OSASCRIPT = "/usr/bin/osascript";
const SYSCTL = "/usr/sbin/sysctl";
const TEMP_DIR = "/tmp/lid-awake-test";
const TEMP_FILE = `${TEMP_DIR}/raycast-lid-awake`;

type Call = { file: string; args: string[] };
type ExecResult = { stdout: string } | { error: Error };
type ExecHandler = (file: string, args: string[]) => ExecResult;

let calls: Call[] = [];
let execHandler: ExecHandler = () => ({ stdout: "" });

function installExecMock(): void {
  vi.mocked(execFile).mockImplementation(((file: string, args: string[], ...rest: unknown[]) => {
    const callback = rest[rest.length - 1] as (
      error: Error | null,
      result?: { stdout: string; stderr: string },
    ) => void;
    calls.push({ file, args });
    const result = execHandler(file, args);
    if ("error" in result) {
      callback(result.error);
    } else {
      callback(null, { stdout: result.stdout, stderr: "" });
    }
  }) as unknown as typeof execFile);
}

function userNamed(username: string): UserInfo<string> {
  return { uid: 501, gid: 20, username, homedir: "/Users/alice", shell: "/bin/zsh" };
}

function failWith(message: string): ExecResult {
  return { error: new Error(message) };
}

beforeEach(() => {
  vi.resetAllMocks();
  calls = [];
  execHandler = () => ({ stdout: "" });
  installExecMock();

  vi.mocked(os.tmpdir).mockReturnValue("/tmp");
  vi.mocked(os.userInfo).mockReturnValue(userNamed("alice"));
  vi.mocked(mkdtemp).mockResolvedValue(TEMP_DIR);
  vi.mocked(writeFile).mockResolvedValue(undefined);
  vi.mocked(rm).mockResolvedValue(undefined);
});

describe("setSleepDisabled", () => {
  it("uses passwordless sudo and does not prompt when the rule is installed", async () => {
    await setSleepDisabled(true);

    expect(calls).toEqual([{ file: SUDO, args: ["-n", PMSET, "-a", "disablesleep", "1"] }]);
    expect(execFile).toHaveBeenCalledWith(SUDO, ["-n", PMSET, "-a", "disablesleep", "1"], expect.any(Function));
  });

  it("falls back to an admin password prompt when sudo fails", async () => {
    execHandler = (file) => (file === SUDO ? failWith("sudo: a password is required") : { stdout: "" });

    await setSleepDisabled(false);

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ file: SUDO, args: ["-n", PMSET, "-a", "disablesleep", "0"] });
    expect(calls[1].file).toBe(OSASCRIPT);
    expect(calls[1].args[0]).toBe("-e");
    expect(calls[1].args[1]).toContain("/usr/bin/pmset -a disablesleep 0");
    expect(calls[1].args[1]).toContain("with administrator privileges");
  });

  it("rejects when the admin prompt is cancelled", async () => {
    execHandler = (file) =>
      file === SUDO ? failWith("sudo: a password is required") : failWith("execution error: User canceled. (-128)");

    await expect(setSleepDisabled(true)).rejects.toThrow("-128");
  });
});

describe("isRuleInstalled", () => {
  it("returns true when sudo can list the pmset rule", async () => {
    await expect(isRuleInstalled()).resolves.toBe(true);
    expect(calls).toEqual([{ file: SUDO, args: ["-n", "-l", PMSET, "-a", "disablesleep", "1"] }]);
  });

  it("returns false when sudo refuses the listing", async () => {
    execHandler = () => failWith("sudo: a password is required");

    await expect(isRuleInstalled()).resolves.toBe(false);
  });
});

describe("installRule", () => {
  const EXPECTED_RULE = `alice ALL=(root) NOPASSWD: ${PMSET} -a disablesleep 0, ${PMSET} -a disablesleep 1\n`;

  it("writes the exact sudoers rule to a temp file", async () => {
    await installRule();

    expect(writeFile).toHaveBeenCalledWith(TEMP_FILE, EXPECTED_RULE, { mode: 0o644 });
  });

  it("validates with visudo before installing into /etc/sudoers.d as an admin", async () => {
    await installRule();

    expect(calls).toEqual([
      {
        file: OSASCRIPT,
        args: [
          "-e",
          `do shell script "/usr/sbin/visudo -cf '${TEMP_FILE}' && /usr/bin/install -m 0440 -o root -g wheel '${TEMP_FILE}' /etc/sudoers.d/raycast-lid-awake" with administrator privileges`,
        ],
      },
    ]);
  });

  it("removes the temp directory after a successful install", async () => {
    await installRule();

    expect(rm).toHaveBeenCalledWith(TEMP_DIR, { recursive: true, force: true });
  });

  it("removes the temp directory even when the admin command fails", async () => {
    execHandler = () => failWith("execution error: User canceled. (-128)");

    await expect(installRule()).rejects.toThrow("-128");
    expect(rm).toHaveBeenCalledWith(TEMP_DIR, { recursive: true, force: true });
  });

  it.each(["bad name", 'al"ice', "al;rm -rf ~", "al$(id)", "ålice"])(
    "rejects the username %j before running anything",
    async (username) => {
      vi.mocked(os.userInfo).mockReturnValue(userNamed(username));

      await expect(installRule()).rejects.toThrow("Unsupported macOS username");
      expect(mkdtemp).not.toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
      expect(calls).toEqual([]);
    },
  );
});

describe("removeRule", () => {
  it("removes the sudoers file as an admin", async () => {
    await removeRule();

    expect(calls).toEqual([
      {
        file: OSASCRIPT,
        args: ["-e", `do shell script "/bin/rm -f /etc/sudoers.d/raycast-lid-awake" with administrator privileges`],
      },
    ]);
  });
});

describe("reading system state", () => {
  it("isSleepDisabled parses pmset -g output", async () => {
    execHandler = () => ({ stdout: "System-wide power settings:\n SleepDisabled\t\t1\n" });

    await expect(isSleepDisabled()).resolves.toBe(true);
    expect(calls).toEqual([{ file: PMSET, args: ["-g"] }]);
  });

  it("getBattery parses pmset -g batt output", async () => {
    execHandler = () => ({
      stdout:
        "Now drawing from 'Battery Power'\n -InternalBattery-0 (id=4653155)\t87%; discharging; 4:12 remaining present: true\n",
    });

    await expect(getBattery()).resolves.toEqual({ hasBattery: true, percent: 87, onAC: false });
    expect(calls).toEqual([{ file: PMSET, args: ["-g", "batt"] }]);
  });

  it("getBootTime parses sysctl kern.boottime output", async () => {
    execHandler = () => ({ stdout: "{ sec = 1728633600, usec = 123456 } Fri Oct 11 09:00:00 2024\n" });

    await expect(getBootTime()).resolves.toBe(1728633600);
    expect(calls).toEqual([{ file: SYSCTL, args: ["-n", "kern.boottime"] }]);
  });
});
