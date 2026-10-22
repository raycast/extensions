import { exec } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { runAppleScript } from "@raycast/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationCanceledError, runWithPrivileges } from "../src/sudoSupport";

// sudoSupport.ts promisifies exec at import time, so the mock answers through `execResult`.
vi.mock("node:child_process", () => ({ exec: vi.fn() }));
vi.mock("node:fs", () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }));
vi.mock("@raycast/utils", () => ({ runAppleScript: vi.fn() }));

let execResult: Error | null = null;
const PAM_FILES: Record<string, string> = {};

beforeEach(() => {
  vi.resetAllMocks();
  execResult = null;
  for (const key of Object.keys(PAM_FILES)) {
    delete PAM_FILES[key];
  }
  vi.mocked(exec).mockImplementation(((_command: string, callback: (error: Error | null, result?: object) => void) => {
    callback(execResult, execResult ? undefined : { stdout: "", stderr: "" });
  }) as unknown as typeof exec);
  vi.mocked(existsSync).mockImplementation((path) => String(path) in PAM_FILES);
  vi.mocked(readFileSync).mockImplementation(((path: string) => PAM_FILES[path]) as typeof readFileSync);
  vi.mocked(runAppleScript).mockResolvedValue("");
});

describe("runWithPrivileges", () => {
  it("asks for the admin password through AppleScript when Touch ID is not enabled for sudo", async () => {
    await runWithPrivileges("/usr/bin/pmset -a disablesleep 1");

    expect(exec).not.toHaveBeenCalled();
    expect(runAppleScript).toHaveBeenCalledWith(
      expect.stringContaining("with administrator privileges"),
      ["/usr/bin/pmset -a disablesleep 1"],
      { timeout: 60000 },
    );
  });

  it("uses sudo when Touch ID is enabled in sudo_local", async () => {
    PAM_FILES["/etc/pam.d/sudo_local"] = "auth       sufficient     pam_tid.so\n";

    await runWithPrivileges("/usr/bin/pmset -a disablesleep 0");

    expect(vi.mocked(exec).mock.calls[0][0]).toBe("/usr/bin/sudo /usr/bin/pmset -a disablesleep 0");
    expect(runAppleScript).not.toHaveBeenCalled();
  });

  it("uses sudo when Touch ID is enabled in /etc/pam.d/sudo", async () => {
    PAM_FILES["/etc/pam.d/sudo"] = "# sudo: auth account password session\nauth sufficient pam_tid.so # Touch ID\n";

    await runWithPrivileges("/usr/bin/pmset -a disablesleep 1");

    expect(exec).toHaveBeenCalledTimes(1);
    expect(runAppleScript).not.toHaveBeenCalled();
  });

  it("ignores a commented-out Touch ID line", async () => {
    PAM_FILES["/etc/pam.d/sudo_local"] = "#auth       sufficient     pam_tid.so\n";

    await runWithPrivileges("/usr/bin/pmset -a disablesleep 1");

    expect(exec).not.toHaveBeenCalled();
    expect(runAppleScript).toHaveBeenCalledTimes(1);
  });

  it("reports a cancelled Touch ID prompt as AuthenticationCanceledError", async () => {
    PAM_FILES["/etc/pam.d/sudo_local"] = "auth sufficient pam_tid.so\n";
    execResult = Object.assign(new Error("Command failed"), {
      stderr: "sudo: a terminal is required to read the password",
    });

    const result = runWithPrivileges("/usr/bin/pmset -a disablesleep 1");

    await expect(result).rejects.toBeInstanceOf(AuthenticationCanceledError);
    await expect(result).rejects.toThrow("Doorstopper was not changed");
  });

  it("rethrows any other sudo failure unchanged", async () => {
    PAM_FILES["/etc/pam.d/sudo_local"] = "auth sufficient pam_tid.so\n";
    const failure = Object.assign(new Error("Command failed"), { stderr: "pmset: permission denied" });
    execResult = failure;

    await expect(runWithPrivileges("/usr/bin/pmset -a disablesleep 1")).rejects.toBe(failure);
  });

  it("rejects when the admin password prompt is cancelled", async () => {
    vi.mocked(runAppleScript).mockRejectedValue(new Error("execution error: User canceled. (-128)"));

    await expect(runWithPrivileges("/usr/bin/pmset -a disablesleep 1")).rejects.toThrow("-128");
  });
});
