/**
 * Recovery-policy sequences, driven through the real executors with the spawn
 * layer mocked: each test scripts the exit codes winget would return and
 * asserts which invocations (argv, elevation) the policy escalates through.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./spawn", () => ({
  runWinget: vi.fn(),
  runWingetElevated: vi.fn(),
  UAC_DECLINED_EXIT_CODE: 1223,
  withQuerySlot: (fn: () => unknown) => fn(),
  configureWingetPath: vi.fn(),
}));

import { runWinget, runWingetElevated } from "./spawn";

import { installPackage, upgradePackage } from "./commands";

const COMMAND_REQUIRES_ADMIN_SIGNED = -1978335207; // 0x8A150019
const PORTABLE_UNINSTALL_FAILED_SIGNED = -1978335145; // 0x8A150057

type SpawnOptions = { onStdout?: (chunk: string) => void };

/** Queue winget responses; each entry is [exitCode, stdout]. */
function scriptRuns(entries: Array<[number, string?]>) {
  for (const [exitCode, stdout = ""] of entries) {
    vi.mocked(runWinget).mockImplementationOnce(async (_args: string[], options?: SpawnOptions) => {
      if (stdout) {
        options?.onStdout?.(stdout);
      }
      return { stdout, stderr: "", exitCode };
    });
  }
}

beforeEach(() => {
  vi.mocked(runWinget).mockReset();
  vi.mocked(runWingetElevated).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("recovery policy sequences", () => {
  it("install escalates silent → unsilenced → elevated on the requires-admin class", async () => {
    scriptRuns([[COMMAND_REQUIRES_ADMIN_SIGNED], [COMMAND_REQUIRES_ADMIN_SIGNED]]);
    vi.mocked(runWingetElevated).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    const result = await installPackage("Foo.Bar", "winget");

    expect(result.success).toBe(true);
    const attempts = vi.mocked(runWinget).mock.calls.map((c) => c[0] as string[]);
    expect(attempts[0]).toContain("--silent");
    expect(attempts[1]).not.toContain("--silent");
    // The elevated relaunch goes back to the silent argv: once winget itself
    // is elevated the installer needs no prompt of its own.
    const elevatedArgs = vi.mocked(runWingetElevated).mock.calls[0]![0] as string[];
    expect(elevatedArgs).toContain("--silent");
  });

  it("upgrade keeps --force when the force retry hits the administrator wall", async () => {
    scriptRuns([[PORTABLE_UNINSTALL_FAILED_SIGNED], [COMMAND_REQUIRES_ADMIN_SIGNED]]);
    vi.mocked(runWingetElevated).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    const result = await upgradePackage("Foo.Bar", "winget");

    expect(result.success).toBe(true);
    const attempts = vi.mocked(runWinget).mock.calls.map((c) => c[0] as string[]);
    expect(attempts[0]).not.toContain("--force");
    expect(attempts[1]).toContain("--force");
    const elevatedArgs = vi.mocked(runWingetElevated).mock.calls[0]![0] as string[];
    expect(elevatedArgs).toContain("--force");
    // The override survives into the terminal message even though the success
    // came from the elevated attempt.
    expect(result.message).toMatch(/--force/);
  });

  it("waits out an installer-mutex collision and retries the same attempt once", async () => {
    vi.useFakeTimers();
    scriptRuns([
      [43, "Installer failed with exit code: 1618"],
      [0, "Successfully installed"],
    ]);

    const pending = installPackage("Foo.Bar", "winget");
    await vi.advanceTimersByTimeAsync(30_000);
    const result = await pending;

    expect(result.success).toBe(true);
    expect(vi.mocked(runWinget).mock.calls).toHaveLength(2);
    expect(vi.mocked(runWinget).mock.calls[1]![0]).toEqual(vi.mocked(runWinget).mock.calls[0]![0]);
    expect(vi.mocked(runWingetElevated)).not.toHaveBeenCalled();
  });

  it("never demotes privilege: a force retry after an elevated attempt stays elevated", async () => {
    scriptRuns([[COMMAND_REQUIRES_ADMIN_SIGNED]]);
    vi.mocked(runWingetElevated)
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: PORTABLE_UNINSTALL_FAILED_SIGNED })
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    const result = await upgradePackage("Foo.Bar", "winget");

    expect(result.success).toBe(true);
    // Exactly one unelevated attempt; the force retry runs through the
    // elevated lane (a demoted attempt would run with cancellation
    // suspended and terminate with the wrong failure class).
    expect(vi.mocked(runWinget).mock.calls).toHaveLength(1);
    const elevatedCalls = vi.mocked(runWingetElevated).mock.calls.map((c) => c[0] as string[]);
    expect(elevatedCalls).toHaveLength(2);
    expect(elevatedCalls[0]).not.toContain("--force");
    expect(elevatedCalls[1]).toContain("--force");
    expect(result.message).toMatch(/--force/);
  });

  it("returns the failure untouched when no rule matches", async () => {
    scriptRuns([[-1978334971]]); // DISK_FULL-class: no recovery rule
    const result = await upgradePackage("Foo.Bar", "winget");
    expect(result.success).toBe(false);
    expect(vi.mocked(runWinget).mock.calls).toHaveLength(1);
    expect(vi.mocked(runWingetElevated)).not.toHaveBeenCalled();
  });
});
