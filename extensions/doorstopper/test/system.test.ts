import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os, { type UserInfo } from "node:os";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBattery,
  getBootTime,
  installRule,
  installRuleScript,
  isRuleInstalled,
  isSleepDisabled,
  removeRuleScript,
  sudoersPathFor,
  removeRule,
  runAsAdmin,
  setSleepDisabled,
  sudoersRule,
} from "../src/lib/system";
import { runWithPrivileges } from "../src/sudoSupport";

// system.ts promisifies execFile at import time, so the mock keeps the same function object and
// answers each call through `execHandler`. Results use the { stdout, stderr } shape that the
// real promisified execFile resolves with.
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

// Doorstopper's Touch ID / admin password prompt. It has its own tests in sudoSupport.test.ts.
vi.mock("../src/sudoSupport", () => ({
  runWithPrivileges: vi.fn(),
}));

// Mocked only so tests can assert that nothing is written through node fs.
vi.mock("node:fs/promises", () => ({
  mkdtemp: vi.fn(),
  writeFile: vi.fn(),
  rm: vi.fn(),
}));

vi.mock("node:os", () => {
  const mocked = { userInfo: vi.fn() };
  return { ...mocked, default: mocked };
});

const PMSET = "/usr/bin/pmset";
const SUDO = "/usr/bin/sudo";
const OSASCRIPT = "/usr/bin/osascript";
const SYSCTL = "/usr/sbin/sysctl";
const SUDOERS = "/etc/sudoers.d/raycast-doorstopper-alice";
const MKTEMP = "/usr/bin/mktemp";
const STAGING_TEMPLATE = "/etc/sudoers.d/.raycast-doorstopper.XXXXXX";
const RULE = `alice ALL=(root) NOPASSWD: ${PMSET} -a disablesleep 0, ${PMSET} -a disablesleep 1`;

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

// The shell command inside `do shell script "..."`, with AppleScript string escapes undone.
function adminShellCommand(): string {
  const match = /^do shell script "(.*)" with administrator privileges$/s.exec(calls[0].args[1]);
  if (!match) {
    throw new Error(`Unexpected AppleScript: ${calls[0].args[1]}`);
  }
  return match[1].replace(/\\(["\\])/g, "$1");
}

beforeEach(() => {
  vi.resetAllMocks();
  calls = [];
  execHandler = () => ({ stdout: "" });
  installExecMock();

  vi.mocked(os.userInfo).mockReturnValue(userNamed("alice"));
});

describe("setSleepDisabled", () => {
  it("uses passwordless sudo and does not prompt when the rule is installed", async () => {
    await setSleepDisabled(true);

    expect(calls).toEqual([{ file: SUDO, args: ["-n", PMSET, "-a", "disablesleep", "1"] }]);
    expect(execFile).toHaveBeenCalledWith(SUDO, ["-n", PMSET, "-a", "disablesleep", "1"], expect.any(Function));
  });

  it("rethrows the sudo error without prompting by default", async () => {
    execHandler = () => failWith("sudo: a password is required");

    await expect(setSleepDisabled(false)).rejects.toThrow("sudo: a password is required");
    expect(calls).toEqual([{ file: SUDO, args: ["-n", PMSET, "-a", "disablesleep", "0"] }]);
    expect(calls.some((call) => call.file === OSASCRIPT)).toBe(false);
    expect(runWithPrivileges).not.toHaveBeenCalled();
  });

  it("does not prompt when passwordless sudo works, even if allowPrompt is true", async () => {
    await setSleepDisabled(true, { allowPrompt: true });

    expect(calls).toEqual([{ file: SUDO, args: ["-n", PMSET, "-a", "disablesleep", "1"] }]);
    expect(runWithPrivileges).not.toHaveBeenCalled();
  });

  it("falls back to Doorstopper's Touch ID or password prompt when sudo fails and allowPrompt is true", async () => {
    execHandler = () => failWith("sudo: a password is required");

    await setSleepDisabled(false, { allowPrompt: true });

    expect(calls).toEqual([{ file: SUDO, args: ["-n", PMSET, "-a", "disablesleep", "0"] }]);
    expect(runWithPrivileges).toHaveBeenCalledWith("/usr/bin/pmset -a disablesleep 0");
  });

  it("prompts to run pmset disablesleep 1 when sudo fails and allowPrompt is true", async () => {
    execHandler = () => failWith("sudo: a password is required");

    await setSleepDisabled(true, { allowPrompt: true });

    expect(runWithPrivileges).toHaveBeenCalledWith("/usr/bin/pmset -a disablesleep 1");
  });

  it("rejects when the prompt is cancelled", async () => {
    execHandler = () => failWith("sudo: a password is required");
    const cancelled = Object.assign(new Error("Doorstopper was not changed"), { name: "AuthenticationCanceledError" });
    vi.mocked(runWithPrivileges).mockRejectedValue(cancelled);

    await expect(setSleepDisabled(true, { allowPrompt: true })).rejects.toBe(cancelled);
  });
});

describe("runAsAdmin", () => {
  it("escapes double quotes and backslashes in the shell command for the AppleScript string", async () => {
    const shell = 'echo "a" \\"b\\" C:\\temp';

    await runAsAdmin(shell);

    expect(calls).toEqual([
      {
        file: OSASCRIPT,
        args: ["-e", 'do shell script "echo \\"a\\" \\\\\\"b\\\\\\" C:\\\\temp" with administrator privileges'],
      },
    ]);
    expect(adminShellCommand()).toBe(shell);
  });
});

describe("isRuleInstalled", () => {
  it("returns true when sudo can list the pmset rule", async () => {
    await expect(isRuleInstalled()).resolves.toBe(true);
    expect(calls).toEqual([{ file: SUDO, args: ["-k", "-n", "-l", PMSET, "-a", "disablesleep", "1"] }]);
  });

  it("ignores cached credentials with -k", async () => {
    await isRuleInstalled();

    expect(calls[0].args).toContain("-k");
  });

  it("returns false when sudo refuses the listing", async () => {
    execHandler = () => failWith("sudo: a password is required");

    await expect(isRuleInstalled()).resolves.toBe(false);
  });
});

describe("installRule", () => {
  it("runs the whole install as a single admin command", async () => {
    await installRule();

    expect(calls).toHaveLength(1);
    expect(calls[0].file).toBe(OSASCRIPT);
    expect(calls[0].args[0]).toBe("-e");
    expect(calls[0].args[1]).toContain("with administrator privileges");
  });

  it("writes the exact sudoers rule inside the root-owned sudoers.d directory", async () => {
    await installRule();

    const shell = adminShellCommand();
    expect(shell).toContain(`T=$(${MKTEMP} ${STAGING_TEMPLATE}) || exit 1;`);
    expect(shell).toContain(`'${RULE}' > "$T"`);
    expect(shell).toContain(`/bin/mv -f "$T" ${SUDOERS}`);
  });

  it("stages in a unique mktemp file under sudoers.d with a dotted name, never a fixed path", async () => {
    await installRule();

    const shell = adminShellCommand();
    const staging = /T=\$\(\/usr\/bin\/mktemp (\S+)\) \|\| exit 1;/.exec(shell);
    expect(staging?.[1]).toMatch(/^\/etc\/sudoers\.d\/\.[^/]+\.X{6}$/);
    expect(shell).not.toContain(".tmp");
    expect(shell).not.toContain("umask");
  });

  it("validates with visudo before moving the file into place", async () => {
    await installRule();

    const shell = adminShellCommand();
    const visudo = shell.indexOf(`/usr/sbin/visudo -cf "$T"`);
    const move = shell.indexOf(`/bin/mv -f "$T" ${SUDOERS}`);
    expect(visudo).toBeGreaterThan(-1);
    expect(move).toBeGreaterThan(visudo);
  });

  it("sets root ownership and 0440 mode on the staged file", async () => {
    await installRule();

    const shell = adminShellCommand();
    expect(shell).toContain('/usr/sbin/chown root:wheel "$T"');
    expect(shell).toContain('/bin/chmod 0440 "$T"');
  });

  it("removes the staging file whether or not the install succeeds", async () => {
    await installRule();

    expect(adminShellCommand()).toMatch(/S=\$\?; \/bin\/rm -f "\$T"; exit \$S$/);
  });

  it("does not write any file through node fs", async () => {
    await installRule();

    expect(mkdtemp).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(rm).not.toHaveBeenCalled();
  });

  it.each(["bad name", 'al"ice', "al;rm -rf ~", "al$(id)", "ålice"])(
    "rejects the username %j before running anything",
    async (username) => {
      vi.mocked(os.userInfo).mockReturnValue(userNamed(username));

      await expect(installRule()).rejects.toThrow("Unsupported macOS username");
      expect(calls).toEqual([]);
    },
  );

  it.each(["first.last", "a-b_c"])("accepts the username %j and embeds it in the sudoers rule", async (username) => {
    vi.mocked(os.userInfo).mockReturnValue(userNamed(username));

    await installRule();

    expect(adminShellCommand()).toContain(
      `'${username} ALL=(root) NOPASSWD: ${PMSET} -a disablesleep 0, ${PMSET} -a disablesleep 1'`,
    );
  });

  it("rejects an empty username before running anything", async () => {
    vi.mocked(os.userInfo).mockReturnValue(userNamed(""));

    await expect(installRule()).rejects.toThrow("Unsupported macOS username");
    expect(calls).toEqual([]);
  });

  it("rejects with the admin error when visudo rejects the staged rule", async () => {
    execHandler = () => failWith("execution error: /usr/sbin/visudo: syntax error near line 1 (1)");

    await expect(installRule()).rejects.toThrow("syntax error");
  });
});

describe("removeRule", () => {
  it("removes the sudoers file as an admin", async () => {
    await removeRule();

    expect(calls).toEqual([
      {
        file: OSASCRIPT,
        args: ["-e", `do shell script "/bin/rm -f /etc/sudoers.d/raycast-doorstopper-alice" with administrator privileges`],
      },
    ]);
  });

  it("rejects when the admin prompt is cancelled", async () => {
    execHandler = () => failWith("execution error: User canceled. (-128)");

    await expect(removeRule()).rejects.toThrow("-128");
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

  it("isSleepDisabled rejects when pmset fails", async () => {
    execHandler = () => failWith("pmset: failed to read power settings");

    await expect(isSleepDisabled()).rejects.toThrow("pmset: failed to read power settings");
  });

  it("getBattery rejects when pmset fails", async () => {
    execHandler = () => failWith("pmset: failed to read battery");

    await expect(getBattery()).rejects.toThrow("pmset: failed to read battery");
  });

  it("getBootTime rejects when sysctl fails", async () => {
    execHandler = () => failWith("sysctl: unknown oid");

    await expect(getBootTime()).rejects.toThrow("sysctl: unknown oid");
  });
});

describe("sudoersRule and installRuleScript", () => {
  it("returns the NOPASSWD rule for pmset disablesleep 0 and 1 only", () => {
    expect(sudoersRule("alice")).toBe(RULE);
  });

  it("gives each account its own rule file, with dots turned into underscores since sudo skips dotted names", () => {
    expect(sudoersPathFor("alice")).toBe(SUDOERS);
    expect(sudoersPathFor("first.last")).toBe("/etc/sudoers.d/raycast-doorstopper-first_last");
  });

  it("rejects an unsupported username", () => {
    expect(() => sudoersRule('al"ice')).toThrow("Unsupported macOS username");
  });

  it("builds the install script from the same rule and removes the rule with removeRuleScript", () => {
    expect(installRuleScript("alice")).toContain(`'${RULE}' > "$T"`);
    expect(removeRuleScript("alice")).toBe(`/bin/rm -f ${SUDOERS}`);
  });
});
