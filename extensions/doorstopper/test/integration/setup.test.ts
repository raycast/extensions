import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorage } from "@raycast/api";
import { disable, enable, getStatus } from "../../src/lib/session";
import {
  getBattery,
  getBootTime,
  installRule,
  installRuleScript,
  isRuleInstalled,
  isSleepDisabled,
  removeRule,
  runAsAdmin,
  setSleepDisabled,
} from "../../src/lib/system";
import { OSASCRIPT, PMSET, SUDOERS_PATH, useFakeMac } from "./fake-mac";
import { resetRaycast } from "./fake-raycast";

// Real session.ts, system.ts and parse.ts against a simulated Mac. Covers the passwordless rule's setup and removal.

vi.mock("node:child_process", () => ({ execFile: vi.fn(), exec: vi.fn() }));
vi.mock("node:fs", () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }));
vi.mock("node:os", () => {
  const mocked = { userInfo: vi.fn() };
  return { ...mocked, default: mocked };
});
vi.mock("@raycast/api", async () => (await import("./fake-raycast")).raycastApi);
vi.mock("@raycast/utils", async () => (await import("./fake-raycast")).raycastUtils);

const mac = useFakeMac();
const RULE = "alice ALL=(root) NOPASSWD: /usr/bin/pmset -a disablesleep 0, /usr/bin/pmset -a disablesleep 1";

// The root shell commands the app sent through the admin prompt, with the AppleScript escapes undone.
// Every command run through an admin password prompt: osascript for the rule, runAppleScript for Doorstopper's prompt.
function adminCommands(): string[] {
  return mac.log
    .filter((call) => call.file === OSASCRIPT || call.file === "runAppleScript")
    .map((call) => {
      if (call.file === "runAppleScript") {
        return call.args[0];
      }
      const match = /^do shell script "(.*)" with administrator privileges$/s.exec(call.args[1]);
      return match ? match[1].replace(/\\(["\\])/g, "$1") : call.args[1];
    });
}

// Every command run through sudo with Touch ID.
function touchIdCommands(): string[] {
  return mac.log.filter((call) => call.file === "sh").map((call) => call.args[0]);
}

beforeEach(() => {
  resetRaycast();
});

describe("before setup", () => {
  it("refuses to start, and leaves sleep allowed and no session stored", async () => {
    await expect(enable(30)).rejects.toThrow("Run Set up Passwordless Doorstopper first");

    expect(mac.sleepDisabled).toBe(false);
    expect((await getStatus()).on).toBe(false);
    expect(Object.keys(await LocalStorage.allItems())).toEqual([]);
  });

  it("reports the rule as not installed", async () => {
    await expect(isRuleInstalled()).resolves.toBe(false);
  });
});

describe("installing the rule", () => {
  it("installs the rule through the admin prompt, with the exact sudoers text", async () => {
    await installRule();

    expect(await isRuleInstalled()).toBe(true);
    expect(mac.sudoersFiles.get(SUDOERS_PATH)).toBe(`${RULE}\n`);
    expect(mac.sudoersMeta.get(SUDOERS_PATH)).toEqual({ owner: "root:wheel", mode: "0440" });
    expect(adminCommands()).toHaveLength(1);
  });

  it("lets the user run only pmset disablesleep 0 and 1", async () => {
    await installRule();

    expect(mac.userMayRun(PMSET, ["-a", "disablesleep", "0"])).toBe(true);
    expect(mac.userMayRun(PMSET, ["-a", "disablesleep", "1"])).toBe(true);
    expect(mac.userMayRun(PMSET, ["-a", "disablesleep", "2"])).toBe(false);
    expect(mac.userMayRun(PMSET, ["-a", "sleep", "0"])).toBe(false);
    expect(mac.userMayRun("/bin/ls", [])).toBe(false);
  });

  it("turns sleep on and off without another prompt once the rule is installed", async () => {
    await installRule();
    mac.clearLog();

    await setSleepDisabled(true);
    expect(mac.sleepDisabled).toBe(true);
    await setSleepDisabled(false);
    expect(mac.sleepDisabled).toBe(false);

    expect(adminCommands()).toEqual([]);
  });

  it("leaves the installed rule untouched when a new install fails the visudo check", async () => {
    await installRule();
    // Breaking the rule's "NOPASSWD:" makes the staged file fail visudo, so the chain must stop before the move.
    const broken = installRuleScript("alice").replace("NOPASSWD: ", "NOPASSWD ");

    await expect(runAsAdmin(broken)).rejects.toThrow("status 1");

    expect(mac.sudoersFiles.get(SUDOERS_PATH)).toBe(`${RULE}\n`);
    expect(mac.stagingFiles).toEqual([]);
  });

  it("ignores a dotted file in sudoers.d, the way sudo does", async () => {
    mac.sudoersFiles.set("/etc/sudoers.d/.raycast-doorstopper.000001", `${RULE}\n`);

    expect(mac.userMayRun(PMSET, ["-a", "disablesleep", "1"])).toBe(false);
  });

  it("rejects the install when the admin prompt is cancelled, and installs nothing", async () => {
    mac.adminPrompt = "cancel";

    await expect(installRule()).rejects.toThrow("User canceled");

    expect(mac.sudoersFiles.size).toBe(0);
    expect(await isRuleInstalled()).toBe(false);
  });

  it("rejects an unsupported username before any admin prompt appears", async () => {
    mac.username = 'al"ice';

    await expect(installRule()).rejects.toThrow("Unsupported macOS username");

    expect(adminCommands()).toEqual([]);
    expect(mac.sudoersFiles.size).toBe(0);
  });
});

describe("removing the rule", () => {
  it("removes the rule, so the user cannot run pmset again and Start fails again", async () => {
    await installRule();
    await enable(30);

    await disable();
    await removeRule();

    expect(mac.sudoersFiles.has(SUDOERS_PATH)).toBe(false);
    expect(await isRuleInstalled()).toBe(false);
    await expect(enable(30)).rejects.toThrow("Run Set up Passwordless Doorstopper first");
  });
});

describe("setSleepDisabled with and without the admin prompt", () => {
  it("falls back to the admin prompt when the rule is missing and allowPrompt is true", async () => {
    await setSleepDisabled(true, { allowPrompt: true });
    expect(mac.sleepDisabled).toBe(true);
    expect(adminCommands()).toEqual(["/usr/bin/pmset -a disablesleep 1"]);

    await setSleepDisabled(false, { allowPrompt: true });
    expect(mac.sleepDisabled).toBe(false);
    expect(adminCommands()).toHaveLength(2);
  });

  it("rejects without a prompt when the rule is missing and allowPrompt is false", async () => {
    await expect(setSleepDisabled(true, { allowPrompt: false })).rejects.toThrow("sudo: a password is required");

    expect(mac.sleepDisabled).toBe(false);
    expect(adminCommands()).toEqual([]);
    expect(touchIdCommands()).toEqual([]);
  });

  it("leaves sleep as it was when the admin prompt is cancelled", async () => {
    mac.adminPrompt = "cancel";

    await expect(setSleepDisabled(true, { allowPrompt: true })).rejects.toThrow("-128");
    expect(mac.sleepDisabled).toBe(false);
  });

  it("uses Touch ID through sudo instead of the password prompt when it is enabled for sudo", async () => {
    mac.touchIdForSudo = true;

    await setSleepDisabled(true, { allowPrompt: true });
    expect(mac.sleepDisabled).toBe(true);
    await setSleepDisabled(false, { allowPrompt: true });
    expect(mac.sleepDisabled).toBe(false);

    expect(touchIdCommands()).toEqual([
      "/usr/bin/sudo /usr/bin/pmset -a disablesleep 1",
      "/usr/bin/sudo /usr/bin/pmset -a disablesleep 0",
    ]);
    expect(adminCommands()).toEqual([]);
  });

  it("reports a cancelled Touch ID prompt as AuthenticationCanceledError and leaves sleep as it was", async () => {
    mac.touchIdForSudo = true;
    mac.touchIdPrompt = "cancel";

    await expect(setSleepDisabled(true, { allowPrompt: true })).rejects.toMatchObject({
      name: "AuthenticationCanceledError",
      message: "Doorstopper was not changed",
    });
    expect(mac.sleepDisabled).toBe(false);
  });

  it("never asks for Touch ID once the rule is installed", async () => {
    mac.touchIdForSudo = true;
    await installRule();
    mac.clearLog();

    await setSleepDisabled(true, { allowPrompt: true });

    expect(mac.sleepDisabled).toBe(true);
    expect(touchIdCommands()).toEqual([]);
    expect(adminCommands()).toEqual([]);
  });
});

describe("battery and boot readings", () => {
  it("reads a battery on battery power", async () => {
    mac.battery = { present: true, percent: 64, onAC: false };

    await expect(getBattery()).resolves.toEqual({ hasBattery: true, percent: 64, onAC: false });
  });

  it("reads a battery on AC power", async () => {
    mac.battery = { present: true, percent: 100, onAC: true };

    await expect(getBattery()).resolves.toEqual({ hasBattery: true, percent: 100, onAC: true });
  });

  it("reports no battery on a Mac without one", async () => {
    mac.battery = { present: false, percent: 0, onAC: true };

    await expect(getBattery()).resolves.toEqual({ hasBattery: false, percent: null, onAC: true });
  });

  it("reads the boot time in seconds", async () => {
    mac.bootTime = 1_700_000_123;

    await expect(getBootTime()).resolves.toBe(1_700_000_123);
  });

  it("reads the sleep setting from pmset", async () => {
    await expect(isSleepDisabled()).resolves.toBe(false);

    mac.sleepDisabled = true;

    await expect(isSleepDisabled()).resolves.toBe(true);
  });
});
