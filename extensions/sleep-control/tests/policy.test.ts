import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  hasManagedGrant,
  parseSleepDisabled,
  permissionScript,
  policyRule,
  shellQuote,
} from "../src/lib/policy.ts";

test("reads global sleep prevention independently of idle assertions", () => {
  assert.equal(
    parseSleepDisabled("System-wide power settings:\n SleepDisabled\t\t0\n sleep 1 (sleep prevented by powerd)\n"),
    false,
  );
  assert.equal(parseSleepDisabled(" SleepDisabled 1\n sleep 1\n"), true);
  for (const value of ["", "sleep 0", "SleepDisabled 2", "SleepDisabled 1abc", "SleepDisabled 0\nSleepDisabled 1"]) {
    assert.throws(() => parseSleepDisabled(value));
  }
});

test("permission policy grants only the two fixed commands", () => {
  assert.equal(
    policyRule("alice"),
    '"alice" ALL=(root) NOPASSWD: /usr/bin/pmset -a disablesleep 0, /usr/bin/pmset -a disablesleep 1\n',
  );
  for (const account of ["root", "", "ALL", "bob;id", "bob\nALL ALL=(ALL) NOPASSWD: ALL", "bob *", "$(id)"]) {
    assert.throws(() => policyRule(account));
  }
});

test("uppercase account names remain literal users rather than aliases", () => {
  assert.ok(policyRule("ADMINS").startsWith('"ADMINS" ALL='));
  assert.ok(!permissionScript("ADMINS", "install").includes("printf '%s' 'ADMINS ALL="));
});

test("setup status requires our current-account grant for both exact commands", () => {
  const entry = `Sudoers entry: /private/etc/sudoers.d/raycast-sleep-control
    RunAsUsers: root
    Options: !authenticate
    Commands:
        /usr/bin/pmset -a disablesleep 0
        /usr/bin/pmset -a disablesleep 1
`;
  assert.equal(hasManagedGrant(entry), true);
  // Installed remains accurate when another policy overrides the effective permission.
  assert.equal(hasManagedGrant(entry + entry.replace("!authenticate", "authenticate")), true);
  assert.equal(
    hasManagedGrant(
      entry.replace("Sudoers entry: /private/etc/sudoers.d/raycast-sleep-control", "Sudoers entry:"),
    ),
    true,
  );
  assert.equal(hasManagedGrant(entry.replace("!authenticate", "authenticate")), false);
  assert.equal(hasManagedGrant(entry.replace("RunAsUsers: root", "RunAsUsers: another")), false);
  assert.equal(
    hasManagedGrant(
      entry.replace("/private/etc/sudoers.d/raycast-sleep-control", "/private/etc/sudoers.d/another"),
    ),
    false,
  );
  assert.equal(hasManagedGrant(entry.replace("/usr/bin/pmset -a disablesleep 1", "/usr/bin/pmset")), false);
  assert.equal(hasManagedGrant("Sudoers entry:\n RunAsUsers: ALL\n Commands:\n ALL\n"), false);
  assert.equal(hasManagedGrant("sudo: a password is required"), false);
});

test("shell quoting keeps quotes, substitutions, and newlines literal", () => {
  const input = "a'b\n$(false);`false`";
  assert.equal(execFileSync("/bin/sh", ["-c", `printf '%s' ${shellQuote(input)}`], { encoding: "utf8" }), input);
});

test("permission scripts parse and generated rules pass visudo", () => {
  for (const action of ["install", "remove"] as const) {
    execFileSync("/bin/sh", ["-n"], { input: permissionScript("alice", action) });
  }
  if (process.platform !== "darwin") return;
  const folder = mkdtempSync(join(tmpdir(), "sleep-control-policy-test-"));
  try {
    const rule = join(folder, "policy");
    writeFileSync(rule, policyRule("alice"));
    execFileSync("/usr/sbin/visudo", ["-cf", rule]);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
