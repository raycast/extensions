/**
 * `confirmAndRun` — the confirmation alert, the progress toast, and what a
 * failure mid-run does.
 *
 * The @raycast/api stub (aliased in vitest.config.mts) records every alert and
 * toast; `child_process`, the filesystem and the brew prefix are mocked so
 * nothing here touches the machine's Homebrew.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { __raycast } from "../__mocks__/raycast-api";
import { preferences } from "../preferences";
import { confirmAndRun } from "./confirmAndRun";

const shell = vi.hoisted(() => ({
  runs: [] as string[],
  /** Throw to fail the command; return to succeed. */
  behaviour: (command: string) => {
    void command;
  },
}));

vi.mock("child_process", () => ({
  exec: (command: string, _options: unknown, callback: (err: Error | null, stdout: string, stderr: string) => void) => {
    shell.runs.push(command);
    try {
      shell.behaviour(command);
      callback(null, "", "");
    } catch (err) {
      callback(err as Error, "", "");
    }
    return {};
  },
}));
// The real `execBrew` runs — it is what `confirmAndRun` delegates to — so only
// what it touches off-process is stubbed: `execBrewEnv` chmods an askpass script
// under the @raycast/api stub's assetsPath, which does not exist here.
vi.mock("fs/promises", () => ({ access: async () => {}, chmod: async () => {} }));
vi.mock("./paths", () => ({ brewPath: () => "/opt/homebrew/bin", brewExecutable: () => "/opt/homebrew/bin/brew" }));

const commands = (n: number) => Array.from({ length: n }, (_, i) => `brew fix-${i + 1}`);

function execFailure(message: string, stderr: string, code = 1): Error {
  return Object.assign(new Error(message), { stderr, stdout: "", code });
}

/** The toast carrying Copy Logs — the failure toast, whichever else is on screen. */
function failureToast() {
  return __raycast.toasts.filter((t) => t.primaryAction?.title === "Copy Logs").at(-1);
}

async function copiedLogs(): Promise<string> {
  const toast = failureToast();
  expect(toast).toBeDefined();
  await toast?.primaryAction?.onAction(toast);
  return __raycast.clipboard.at(-1) ?? "";
}

beforeEach(() => {
  __raycast.reset();
  shell.runs.length = 0;
  shell.behaviour = () => {};
});

describe("the confirmation alert", () => {
  it("lists eight commands with no suffix", async () => {
    await confirmAndRun(commands(8), { title: "Fix All" });
    const message = __raycast.alerts[0].message ?? "";
    expect(message.split("\n")).toEqual(commands(8));
  });

  it("lists the first eight and counts the rest", async () => {
    await confirmAndRun(commands(9), { title: "Fix All" });
    const message = __raycast.alerts[0].message ?? "";
    expect(message.split("\n")).toEqual([...commands(8), "…and 1 more"]);
  });

  it("runs nothing when the alert is dismissed", async () => {
    __raycast.confirmAlertResponse = false;
    expect(await confirmAndRun(commands(2), { title: "Fix All" })).toBe(false);
    expect(shell.runs).toEqual([]);
  });
});

describe("the progress toast", () => {
  it("counts the steps for a multi-command run", async () => {
    await confirmAndRun(commands(3), { title: "Fix All" });
    expect(__raycast.toasts[0].messages).toEqual([
      "Running fix 1 of 3…",
      "Running fix 1 of 3…",
      "Running fix 2 of 3…",
      "Running fix 3 of 3…",
    ]);
  });

  it("takes the caller's step noun", async () => {
    await confirmAndRun(commands(2), { title: "Upgrade", stepNoun: "upgrade" });
    expect(__raycast.toasts[0].messages).toContain("Running upgrade 2 of 2…");
  });

  it("shows the raw command for a single-command run", async () => {
    await confirmAndRun(["brew update"], { title: "Update Homebrew?" });
    expect(__raycast.toasts[0].messages).toEqual(["brew update", "brew update"]);
  });
});

describe("failures", () => {
  it("stops at the first failure by default", async () => {
    shell.behaviour = (command) => {
      if (command === "brew fix-2") throw execFailure("Command failed", "boom");
    };
    expect(await confirmAndRun(commands(3), { title: "Fix All" })).toBe(false);
    expect(shell.runs).toEqual(["brew fix-1", "brew fix-2"]);
  });

  it("runs every command with continueOnError and reports each failure", async () => {
    shell.behaviour = (command) => {
      if (command !== "brew fix-2") throw execFailure("Command failed", `${command} exploded`, 2);
    };
    expect(await confirmAndRun(commands(3), { title: "Fix All", continueOnError: true })).toBe(true);
    expect(shell.runs).toEqual(commands(3));

    const toast = failureToast();
    expect(toast?.message).toContain("2 of 3 failed");
    expect(toast?.message).toContain("brew fix-1");
    expect(toast?.message?.split("\n")).toHaveLength(1);

    const logs = await copiedLogs();
    expect(logs).toContain("brew fix-1 (exit 2): brew fix-1 exploded");
    expect(logs).toContain("brew fix-3 (exit 2): brew fix-3 exploded");
  });

  it("is false when every command fails", async () => {
    shell.behaviour = (command) => {
      throw execFailure("Command failed", `${command} exploded`);
    };
    expect(await confirmAndRun(commands(2), { title: "Fix All", continueOnError: true })).toBe(false);
    expect(shell.runs).toEqual(commands(2));
  });

  it("presents a continued lock failure as a lock", async () => {
    shell.behaviour = (command) => {
      if (command === "brew fix-1")
        throw execFailure("Command failed", "Error: Another active Homebrew process is running");
    };
    await confirmAndRun(commands(2), { title: "Fix All", continueOnError: true });
    expect(failureToast()?.title).toBe("Brew is Busy");
    // The raw exit code and stderr survive the BrewLockError wrapper.
    expect(await copiedLogs()).toContain("brew fix-1 (exit 1): Error: Another active Homebrew process is running");
  });

  it("leaves a raw command's own 127 stderr alone when a custom brew path is set", async () => {
    // execBrew rewrites a 127 to "Brew executable not found at: …" when
    // customBrewPath is set. A remediation is NOT the brew executable, so a
    // missing `sudo` must not be reported as a missing brew.
    const previous = preferences.customBrewPath;
    preferences.customBrewPath = "/custom/brew/bin/brew";
    try {
      shell.behaviour = () => {
        throw execFailure("Command failed", "command not found: sudo", 127);
      };
      await confirmAndRun(["sudo chown me /opt/homebrew"], { title: "Fix All", continueOnError: true });
      const logs = await copiedLogs();
      expect(logs).toContain("command not found: sudo");
      expect(logs).not.toContain("Brew executable not found at");
    } finally {
      preferences.customBrewPath = previous;
    }
  });

  it("stops immediately when the toast's Cancel is used", async () => {
    shell.behaviour = (command) => {
      if (command !== "brew fix-2") return;
      const running = __raycast.toasts[0];
      running.primaryAction?.onAction(running); // the Cancel action aborts the run
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    };
    expect(await confirmAndRun(commands(4), { title: "Fix All", continueOnError: true })).toBe(false);
    expect(shell.runs).toEqual(["brew fix-1", "brew fix-2"]);
  });
});
