import { homedir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { miseJson, observeCommands, runMise, type CommandEvent } from "./exec";
import type { MiseLocation } from "./locate";

const env = { PATH: "/usr/bin:/bin", MISE_YES: "1", NO_COLOR: "1" } as const;

describe("mise processes run from the home directory", () => {
  it("runMise", async () => {
    const result = await runMise({ path: "/bin/pwd", env }, []);
    expect(result.stdout.trim()).toBe(homedir());
  });

  it("miseJson", async () => {
    const location: MiseLocation = { path: "/bin/sh", env };
    const cwd = await miseJson(location, ["-c", 'printf \'"%s"\' "$PWD"', "--"], (raw) => raw as string);
    expect(cwd).toBe(homedir());
  });
});

describe("observeCommands", () => {
  afterEach(() => observeCommands(undefined));

  it("reports the full command line, exit code and duration of every run", async () => {
    const events: CommandEvent[] = [];
    observeCommands((event) => events.push(event));

    await runMise({ path: "/bin/sh", env }, ["-c", "exit 3"]);
    await miseJson({ path: "/bin/sh", env }, ["-c", "echo 1", "--"], (raw) => raw);
    await expect(miseJson({ path: "/bin/sh", env }, ["-c", "exit 2", "--"], (raw) => raw)).rejects.toThrow();

    expect(events).toEqual([
      { args: ["-c", "exit 3"], code: 3, ms: expect.any(Number) },
      { args: ["-c", "echo 1", "--", "--json"], code: 0, ms: expect.any(Number) },
      { args: ["-c", "exit 2", "--", "--json"], code: 2, ms: expect.any(Number) },
    ]);
  });

  it("is silent again once the observer is cleared", async () => {
    const observer = vi.fn();
    observeCommands(observer);
    observeCommands(undefined);
    await runMise({ path: "/bin/pwd", env }, []);
    expect(observer).not.toHaveBeenCalled();
  });
});
