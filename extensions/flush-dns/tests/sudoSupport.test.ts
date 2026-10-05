import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createPrivilegeRunner, type PrivilegedCommand } from "../src/sudoSupport.ts";

const COMMANDS: readonly PrivilegedCommand[] = [
  { executable: "/usr/bin/dscacheutil", args: ["-flushcache"] },
  { executable: "/usr/bin/killall", args: ["-HUP", "mDNSResponder"] },
];

describe("createPrivilegeRunner", () => {
  test("runs every command in order through sudo when Touch ID is active", async () => {
    const calls: Array<{ executable: string; args: readonly string[]; timeout?: number }> = [];
    const runWithPrivileges = createPrivilegeRunner({
      exists: () => true,
      read: () => "auth       sufficient     pam_tid.so\n",
      execute: async (executable, args, timeout) => {
        calls.push({ executable, args, timeout });
      },
    });

    await runWithPrivileges(COMMANDS);

    assert.deepEqual(calls, [
      {
        executable: "/usr/bin/sudo",
        args: ["/usr/bin/dscacheutil", "-flushcache"],
        timeout: undefined,
      },
      {
        executable: "/usr/bin/sudo",
        args: ["/usr/bin/killall", "-HUP", "mDNSResponder"],
        timeout: undefined,
      },
    ]);
  });

  test("uses one AppleScript password prompt when the Touch ID rule is commented out", async () => {
    const calls: Array<{ executable: string; args: readonly string[]; timeout?: number }> = [];
    const runWithPrivileges = createPrivilegeRunner({
      exists: () => true,
      read: () => "# auth       sufficient     pam_tid.so\n",
      execute: async (executable, args, timeout) => {
        calls.push({ executable, args, timeout });
      },
    });

    await runWithPrivileges(COMMANDS);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].executable, "/usr/bin/osascript");
    assert.equal(calls[0].timeout, 60_000);
    assert.equal(calls[0].args[0], "-e");
    assert.match(calls[0].args[1], /do shell script item 1 of argv/);
    assert.deepEqual(calls[0].args.slice(2), [
      "--",
      "'/usr/bin/dscacheutil' '-flushcache'; '/usr/bin/killall' '-HUP' 'mDNSResponder'",
    ]);
  });

  test("reads the standard sudo PAM file when sudo_local is missing", async () => {
    const readPaths: string[] = [];
    const calls: Array<{ executable: string; args: readonly string[] }> = [];
    const runWithPrivileges = createPrivilegeRunner({
      exists: () => false,
      read: (path) => {
        readPaths.push(path);
        return "auth sufficient pam_tid.so\n";
      },
      execute: async (executable, args) => {
        calls.push({ executable, args });
      },
    });

    await runWithPrivileges(COMMANDS);

    assert.deepEqual(readPaths, ["/etc/pam.d/sudo"]);
    assert.equal(calls[0].executable, "/usr/bin/sudo");
  });

  test("uses the password fallback when the PAM configuration cannot be read", async () => {
    const calls: Array<{ executable: string; args: readonly string[] }> = [];
    const runWithPrivileges = createPrivilegeRunner({
      exists: () => true,
      read: () => {
        throw new Error("permission denied");
      },
      execute: async (executable, args) => {
        calls.push({ executable, args });
      },
    });

    await runWithPrivileges(COMMANDS);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].executable, "/usr/bin/osascript");
  });

  test("does not open the password fallback after sudo authentication fails", async () => {
    const calls: string[] = [];
    const authenticationError = new Error("Touch ID cancelled");
    const runWithPrivileges = createPrivilegeRunner({
      exists: () => true,
      read: () => "auth sufficient pam_tid.so\n",
      execute: async (executable) => {
        calls.push(executable);
        throw authenticationError;
      },
    });

    await assert.rejects(runWithPrivileges(COMMANDS), authenticationError);
    assert.deepEqual(calls, ["/usr/bin/sudo"]);
  });
});
