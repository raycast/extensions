/**
 * execBrewWithProgress — the streaming runner behind upgrades, installs and
 * adoptions. Only what it touches off-process is stubbed: `spawn` (recorded,
 * never run) and `execBrewEnv` (which would chmod a script under assetsPath).
 */

import { EventEmitter } from "events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const spawned = vi.hoisted(() => ({ calls: [] as { args: string[]; env: NodeJS.ProcessEnv }[] }));

vi.mock("child_process", () => ({
  spawn: (_bin: string, args: string[], options: { env: NodeJS.ProcessEnv }) => {
    spawned.calls.push({ args, env: options.env });
    // A process that exits 0 on the next tick with no output.
    const proc = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: () => true,
    });
    setTimeout(() => proc.emit("close", 0), 0);
    return proc;
  },
}));

// Resolves on a later tick, so a cancel can land while it is being awaited —
// the window the bug lived in.
const envReady = vi.hoisted(() => ({ gate: undefined as undefined | (() => void) }));
vi.mock("./commands", () => ({
  execBrewEnv: () =>
    new Promise<NodeJS.ProcessEnv>((resolve) => {
      envReady.gate = () => resolve({ PATH: "/usr/bin" });
    }),
}));
vi.mock("./paths", () => ({ brewExecutable: () => "/opt/homebrew/bin/brew" }));

import { execBrewWithProgress } from "./progress";

beforeEach(() => {
  spawned.calls.length = 0;
  envReady.gate = undefined;
});

describe("execBrewWithProgress", () => {
  it("never starts brew when Cancel lands while the environment is prepared", async () => {
    // The abort listener used to be attached AFTER this await, so an abort that
    // fired during it was already spent and never ran: the user pressed Cancel
    // and the adoption happened anyway.
    const controller = new AbortController();
    const run = execBrewWithProgress("install --adopt --cask foo", undefined, controller.signal);
    controller.abort();
    envReady.gate?.();
    await expect(run).rejects.toMatchObject({ name: "AbortError" });
    expect(spawned.calls).toEqual([]);
  });

  it("layers per-invocation env over the shared environment", async () => {
    const run = execBrewWithProgress("install --adopt --cask foo", undefined, undefined, {
      env: { BREW_ASKPASS_MARKER: "/tmp/marker" },
    });
    envReady.gate?.();
    await run;
    expect(spawned.calls).toHaveLength(1);
    expect(spawned.calls[0].env).toMatchObject({ PATH: "/usr/bin", BREW_ASKPASS_MARKER: "/tmp/marker" });
    expect(spawned.calls[0].args).toEqual(["install", "--adopt", "--cask", "foo"]);
  });
});
