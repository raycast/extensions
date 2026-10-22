/**
 * `confirmAndRun` — the confirmation alert, the progress toast, and what a
 * failure mid-run does.
 *
 * The @raycast/api stub (aliased in vitest.config.mts) records every alert and
 * toast; `child_process`, the filesystem and the brew prefix are mocked so
 * nothing here touches the machine's Homebrew.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrewCommandError } from "../errors";
import { __logs } from "../__mocks__/raycast-logger";
import { __raycast } from "../__mocks__/raycast-api";
import { preferences } from "../preferences";
import { confirmAndRun } from "./confirmAndRun";

const shell = vi.hoisted(() => ({
  runs: [] as string[],
  /** Throw to fail the command; return to succeed. */
  behavior: (command: string) => {
    void command;
  },
}));

vi.mock("child_process", () => ({
  exec: (command: string, _options: unknown, callback: (err: Error | null, stdout: string, stderr: string) => void) => {
    shell.runs.push(command);
    try {
      shell.behavior(command);
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
  __logs.length = 0;
  __raycast.reset();
  shell.runs.length = 0;
  shell.behavior = () => {};
});

describe("run", () => {
  it("replaces the buffered runner, and each report becomes the toast's message", async () => {
    const ran: string[] = [];
    await confirmAndRun(["brew install --adopt --cask diffusionbee"], {
      title: "Adopt DiffusionBee",
      labels: { progress: "Adopting DiffusionBee…" },
      run: async (command, _signal, report) => {
        ran.push(command);
        report("Installing Cask diffusionbee · 0:03");
        report("Adopting existing App · 0:31");
      },
    });
    expect(ran).toEqual(["brew install --adopt --cask diffusionbee"]);
    expect(shell.runs).toEqual([]); // execBrew never ran
    expect(__raycast.toasts[0].messages).toEqual([
      "Installing Cask diffusionbee · 0:03",
      "Adopting existing App · 0:31",
    ]);
  });

  it("logs the exit code of a streamed failure, which carries exitCode not code", async () => {
    await confirmAndRun(["brew install --adopt --cask foo"], {
      title: "Adopt Foo",
      run: async () => {
        throw new BrewCommandError("brew exited 1", { exitCode: 1, stderr: "Error: nope" });
      },
    });
    expect(__logs.find((l) => l.message === "Command failed")?.data).toMatchObject({
      exitCode: 1,
      stderr: "Error: nope",
    });
  });

  it("reports a failure from the runner like any other", async () => {
    await confirmAndRun(["brew install --adopt --cask foo"], {
      title: "Adopt Foo",
      labels: { failure: "Could Not Adopt Foo" },
      run: async () => {
        throw execFailure("exit 1", "Error: It seems the App source is not there.");
      },
    });
    expect(failureToast()?.title).toBe("Could Not Adopt Foo");
    expect(__logs.find((l) => l.message === "Command failed")?.level).toBe("error");
  });
});

describe("logging", () => {
  // This runs arbitrary shell strings — Doctor's remediations include
  // `sudo chown` — and before this nothing recorded that one had run.
  // Scoped to this runner's own lines: `execBrewEnv` logs "Homebrew
  // Configuration" once per process, into whichever test happens to run first.
  const messages = () => __logs.map((l) => l.message).filter((m) => m !== "Homebrew Configuration");

  it("records a confirmed run, each command, and the outcome", async () => {
    await confirmAndRun(["sudo chown -R me /opt/homebrew"], { title: "Fix All" });
    expect(messages()).toEqual(["Running confirmed commands", "Command succeeded", "Run completed"]);
    expect(__logs[0].data).toMatchObject({ commands: ["sudo chown -R me /opt/homebrew"] });
  });

  it("records a failed command at error level, with its stderr", async () => {
    shell.behavior = () => {
      throw execFailure("exit 1", "chown: /opt/homebrew: Operation not permitted");
    };
    await confirmAndRun(["sudo chown -R me /opt/homebrew"], { title: "Fix All" });
    const failed = __logs.find((l) => l.message === "Command failed");
    expect(failed?.level).toBe("error");
    expect(failed?.data).toMatchObject({ stderr: "chown: /opt/homebrew: Operation not permitted", exitCode: 1 });
  });

  it("records a run declined at the dialog, and runs nothing", async () => {
    __raycast.confirmAlertResponse = false;
    await confirmAndRun(["brew doctor-fix"], { title: "Fix All" });
    expect(messages()).toEqual(["Run canceled at confirmation"]);
  });

  it("records a run stopped by beforeRun", async () => {
    await confirmAndRun(["brew install --adopt --cask foo"], { title: "Adopt Foo", beforeRun: async () => false });
    expect(messages()).toEqual(["Run stopped before starting: precondition no longer holds"]);
  });

  it("records a partial run as finished with failures", async () => {
    shell.behavior = (command) => {
      if (command.endsWith("2")) throw execFailure("exit 1", "nope");
    };
    await confirmAndRun(commands(3), { title: "Fix All", continueOnError: true });
    expect(__logs.find((l) => l.message === "Run finished with failures")?.data).toMatchObject({ failed: 1, of: 3 });
  });
});

describe("labels", () => {
  // Adopt read as a toast titled "Adopt" over the raw
  // `/opt/homebrew/bin/brew install --adopt --cask updatest`. The raw command
  // stays the default because Doctor's commands ARE the point.
  it("replaces the raw command with the progress label on a single-command run", async () => {
    await confirmAndRun(["brew install --adopt --cask updatest"], {
      title: "Adopt Updatest",
      labels: { progress: "Adopting Updatest…" },
    });
    expect(__raycast.toasts[0].title).toBe("Adopting Updatest…");
    expect(__raycast.toasts[0].messages).toEqual([]);
  });

  it("titles the success toast with the success label", async () => {
    await confirmAndRun(["brew install --adopt --cask updatest"], {
      title: "Adopt Updatest",
      labels: { success: "Adopted Updatest" },
    });
    expect(__raycast.toasts.map((t) => t.title)).toContain("Adopted Updatest");
    expect(__raycast.toasts.map((t) => t.title)).not.toContain("Adopt Updatest done");
  });

  it("titles the failure toast with the failure label", async () => {
    shell.behavior = () => {
      throw execFailure("exit 1", "Error: It seems there is already an App at '/Applications/Foo.app'.");
    };
    await confirmAndRun(["brew install --adopt --cask foo"], {
      title: "Adopt Foo",
      labels: { failure: "Could Not Adopt Foo" },
    });
    expect(failureToast()?.title).toBe("Could Not Adopt Foo");
  });

  it("keeps a step count under a progress label when there are several commands", async () => {
    await confirmAndRun(commands(2), { title: "Fix All", labels: { progress: "Fixing…" } });
    expect(__raycast.toasts[0].messages).toContain("Running fix 2 of 2…");
  });
});

describe("beforeRun", () => {
  // Adopt uses this to re-check the app still exists AFTER the dialog: the
  // dialog stays open as long as the user leaves it, and `--adopt` with nothing
  // at the target silently becomes a fresh install.
  it("runs nothing when the precondition fails after confirmation", async () => {
    const ok = await confirmAndRun(commands(1), { title: "Adopt", beforeRun: async () => false });
    expect(ok).toBe(false);
    expect(shell.runs).toEqual([]);
  });

  it("runs the command when the precondition holds", async () => {
    await confirmAndRun(commands(1), { title: "Adopt", beforeRun: async () => true });
    expect(shell.runs).toHaveLength(1);
  });

  it("is checked only after the user confirms, never instead of asking", async () => {
    __raycast.confirmAlertResponse = false;
    let checked = false;
    await confirmAndRun(commands(1), {
      title: "Adopt",
      beforeRun: async () => {
        checked = true;
        return true;
      },
    });
    expect(checked).toBe(false);
    expect(shell.runs).toEqual([]);
  });
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
    shell.behavior = (command) => {
      if (command === "brew fix-2") throw execFailure("Command failed", "boom");
    };
    expect(await confirmAndRun(commands(3), { title: "Fix All" })).toBe(false);
    expect(shell.runs).toEqual(["brew fix-1", "brew fix-2"]);
  });

  it("runs every command with continueOnError and reports each failure", async () => {
    shell.behavior = (command) => {
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
    shell.behavior = (command) => {
      throw execFailure("Command failed", `${command} exploded`);
    };
    expect(await confirmAndRun(commands(2), { title: "Fix All", continueOnError: true })).toBe(false);
    expect(shell.runs).toEqual(commands(2));
  });

  it("presents a continued lock failure as a lock", async () => {
    shell.behavior = (command) => {
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
      shell.behavior = () => {
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
    shell.behavior = (command) => {
      if (command !== "brew fix-2") return;
      const running = __raycast.toasts[0];
      running.primaryAction?.onAction(running); // the Cancel action aborts the run
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    };
    expect(await confirmAndRun(commands(4), { title: "Fix All", continueOnError: true })).toBe(false);
    expect(shell.runs).toEqual(["brew fix-1", "brew fix-2"]);
  });
});
