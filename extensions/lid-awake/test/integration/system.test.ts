import { spawn } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  getBattery,
  getBootTime,
  installRuleScript,
  isSleepDisabled,
  REMOVE_RULE_SCRIPT,
  SUDOERS_PATH,
  setSleepDisabled,
  sudoersRule,
} from "../../src/lib/system";
import { assertPasswordlessSudo, rawSleepDisabled, runIntegration, sh, succeeds, sudoSh } from "./env";

// Real system.ts against the real binaries. Nothing here is mocked.

const SUDO = "/usr/bin/sudo";
const PMSET = "/usr/bin/pmset";
const VISUDO = "/usr/sbin/visudo";
const DSCL = "/usr/bin/dscl";
const TEST_USER = "lidawakeit";
const RULE_FILE_NAME = "raycast-lid-awake";

// Runs a command as the unprivileged test user. The outer sudo switches user; the inner sudo applies the sudoers rule.
function asUser(args: string[]): boolean {
  return succeeds(SUDO, ["-n", "-u", TEST_USER, SUDO, "-k", "-n", ...args]);
}

function userExists(): boolean {
  return succeeds(DSCL, [".", "-read", `/Users/${TEST_USER}`]);
}

// Lid Awake's files in sudoers.d, including any staging file a failed install left behind.
function ruleFiles(): string[] {
  return sudoSh("/bin/ls -A /etc/sudoers.d")
    .split("\n")
    .filter((name) => name.includes(RULE_FILE_NAME));
}

function installedRuleText(): string {
  return sudoSh(`/bin/cat ${SUDOERS_PATH}`);
}

function visudoAccepts(text: string): boolean {
  const file = sh(`/usr/bin/mktemp ${join(os.tmpdir(), "lid-awake-rule.XXXXXX")}`).trim();
  try {
    writeFileSync(file, text);
    return succeeds(VISUDO, ["-cf", file]);
  } finally {
    rmSync(file, { force: true });
  }
}

// Resolves with the exit code of `sudo -n /bin/sh -c script`, so two installs can be run at the same time.
function runScript(script: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(SUDO, ["-n", "/bin/sh", "-c", script], { stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => resolve(code));
  });
}

// The first free UID at or above 5501, so the test user never clashes with a real account.
function freeUid(): number {
  const taken = new Set(
    sh(`${DSCL} . -list /Users UniqueID`)
      .split("\n")
      .map((line) => Number(line.trim().split(/\s+/).pop())),
  );
  let uid = 5501;
  while (taken.has(uid)) {
    uid++;
  }
  return uid;
}

function restoreSystem(): void {
  sudoSh(`${PMSET} -a disablesleep 0`);
  sudoSh(REMOVE_RULE_SCRIPT);
}

describe.runIf(runIntegration)("system.ts on macOS", () => {
  beforeAll(() => {
    assertPasswordlessSudo();
    restoreSystem();
  });

  afterEach(() => {
    restoreSystem();
  });

  describe("sleep setting", () => {
    it("turns sleep off with setSleepDisabled(true), seen by pmset and by isSleepDisabled", async () => {
      await setSleepDisabled(true);

      expect(rawSleepDisabled()).toBe(true);
      await expect(isSleepDisabled()).resolves.toBe(true);
    });

    it("turns sleep back on with setSleepDisabled(false), seen by pmset and by isSleepDisabled", async () => {
      await setSleepDisabled(true);
      await setSleepDisabled(false);

      expect(rawSleepDisabled()).toBe(false);
      await expect(isSleepDisabled()).resolves.toBe(false);
    });

    it("sees a sleep change made outside the extension", async () => {
      sudoSh(`${PMSET} -a disablesleep 1`);

      await expect(isSleepDisabled()).resolves.toBe(true);
    });
  });

  describe("power and boot readings", () => {
    it("reports a battery and AC power the same way the raw pmset output does", async () => {
      const raw = sh(`${PMSET} -g batt`);

      const battery = await getBattery();

      expect(battery.hasBattery).toBe(raw.includes("InternalBattery"));
      expect(battery.onAC).toBe(raw.includes("'AC Power'"));
    });

    it("reports the boot time that sysctl gives, which is a plausible Unix time in seconds", async () => {
      const raw = sh("/usr/sbin/sysctl -n kern.boottime");
      const match = /sec\s*=\s*(\d+)/.exec(raw);
      expect(match).not.toBeNull();
      const sec = Number(match?.[1]);

      await expect(getBootTime()).resolves.toBe(sec);
      expect(sec).toBeGreaterThan(Date.UTC(2020, 0, 1) / 1000);
      expect(sec).toBeLessThanOrEqual(Date.now() / 1000);
    });
  });

  describe("sudoers syntax", () => {
    it("accepts the rule sudoersRule builds, according to the real visudo", () => {
      expect(visudoAccepts(`${sudoersRule(TEST_USER)}\n`)).toBe(true);
    });

    it("rejects a malformed rule, so the check above is not passing for every input", () => {
      expect(visudoAccepts(`${TEST_USER} ALL=(root NOPASSWD: ${PMSET}\n`)).toBe(false);
    });
  });

  describe("the rule for a dedicated user", () => {
    beforeAll(() => {
      if (userExists()) {
        sudoSh(`${DSCL} . -delete /Users/${TEST_USER}`);
      }
      const uid = freeUid();
      sudoSh(`${DSCL} . -create /Users/${TEST_USER}`);
      sudoSh(`${DSCL} . -create /Users/${TEST_USER} UserShell /bin/bash`);
      sudoSh(`${DSCL} . -create /Users/${TEST_USER} UniqueID ${uid}`);
      sudoSh(`${DSCL} . -create /Users/${TEST_USER} PrimaryGroupID 20`);
      sudoSh(`${DSCL} . -create /Users/${TEST_USER} NFSHomeDirectory /var/empty`);
    });

    afterAll(() => {
      restoreSystem();
      if (userExists()) {
        sudoSh(`${DSCL} . -delete /Users/${TEST_USER}`);
      }
    });

    describe("before the rule is installed", () => {
      it("denies the test user pmset disablesleep", () => {
        expect(asUser(["-l", PMSET, "-a", "disablesleep", "1"])).toBe(false);
      });
    });

    describe("installing the rule", () => {
      it("writes the file as root:wheel with mode 0440 and the exact rule text", () => {
        sudoSh(installRuleScript(TEST_USER));

        expect(sh(`/usr/bin/stat -f '%Su:%Sg %Lp' ${SUDOERS_PATH}`).trim()).toBe("root:wheel 440");
        expect(installedRuleText()).toBe(`${sudoersRule(TEST_USER)}\n`);
      });

      it("leaves no staging file behind and passes the real visudo check", () => {
        sudoSh(installRuleScript(TEST_USER));

        expect(ruleFiles()).toEqual([RULE_FILE_NAME]);
        expect(succeeds(SUDO, ["-n", VISUDO, "-c"])).toBe(true);
      });

      it("succeeds when run twice in a row and leaves the same single file", () => {
        sudoSh(installRuleScript(TEST_USER));
        sudoSh(installRuleScript(TEST_USER));

        expect(ruleFiles()).toEqual([RULE_FILE_NAME]);
        expect(installedRuleText()).toBe(`${sudoersRule(TEST_USER)}\n`);
      });

      it("leaves one valid file when two installs run at the same time", async () => {
        const script = installRuleScript(TEST_USER);

        await expect(Promise.all([runScript(script), runScript(script)])).resolves.toEqual([0, 0]);

        expect(ruleFiles()).toEqual([RULE_FILE_NAME]);
        expect(installedRuleText()).toBe(`${sudoersRule(TEST_USER)}\n`);
        expect(succeeds(SUDO, ["-n", VISUDO, "-c"])).toBe(true);
      });

      it("keeps the existing rule untouched when a new rule fails the visudo check", async () => {
        sudoSh(installRuleScript(TEST_USER));
        const before = installedRuleText();
        // A different username makes the new rule differ from the installed one, so an overwrite would be visible.
        const script = installRuleScript("someoneelse");
        const sabotaged = script.replace(`${VISUDO} -cf`, "/usr/bin/false");
        expect(sabotaged).not.toBe(script);

        await expect(runScript(sabotaged)).resolves.not.toBe(0);

        expect(installedRuleText()).toBe(before);
        expect(ruleFiles()).toEqual([RULE_FILE_NAME]);
      });
    });

    describe("what the installed rule allows", () => {
      beforeEach(() => {
        sudoSh(installRuleScript(TEST_USER));
      });

      it("allows only pmset disablesleep 1 and 0 for the test user", () => {
        expect(asUser(["-l", PMSET, "-a", "disablesleep", "1"])).toBe(true);
        expect(asUser(["-l", PMSET, "-a", "disablesleep", "0"])).toBe(true);
        expect(asUser(["-l", PMSET, "-a", "disablesleep", "2"])).toBe(false);
        expect(asUser(["-l", PMSET, "-a", "sleep", "0"])).toBe(false);
        expect(asUser(["-l", PMSET, "-g"])).toBe(false);
        expect(asUser(["-l", "/bin/ls"])).toBe(false);
      });

      it("lets the test user switch sleep off and on, and the change shows up in pmset", () => {
        expect(asUser([PMSET, "-a", "disablesleep", "1"])).toBe(true);
        expect(rawSleepDisabled()).toBe(true);

        expect(asUser([PMSET, "-a", "disablesleep", "0"])).toBe(true);
        expect(rawSleepDisabled()).toBe(false);
      });
    });

    describe("removing the rule", () => {
      beforeEach(() => {
        sudoSh(installRuleScript(TEST_USER));
      });

      it("removes the file, and the test user loses its pmset rights", () => {
        sudoSh(REMOVE_RULE_SCRIPT);

        expect(ruleFiles()).toEqual([]);
        expect(asUser(["-l", PMSET, "-a", "disablesleep", "1"])).toBe(false);
      });
    });
  });
});
