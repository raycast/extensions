import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QUIT_TIMEOUT_MS, RestartCoordinator, describeResult } from "../src/lib/restart.ts";
import type { RestartDeps, RestartStage, TerminateOutcome } from "../src/lib/restart.ts";
import type { RawRunningApp, RestartableApp } from "../src/lib/types.ts";

const app: RestartableApp = {
  pid: 4242,
  name: "TextEdit",
  bundleId: "com.apple.TextEdit",
  bundlePath: "/System/Applications/TextEdit.app",
  executablePath: "/System/Applications/TextEdit.app/Contents/MacOS/TextEdit",
  kind: "regular",
};

interface FakeOptions {
  terminate?: (target: RestartableApp) => Promise<TerminateOutcome>;
  /** Number of isRunning polls that still report the process alive; Infinity never exits. */
  pollsUntilExit?: number;
  running?: RawRunningApp[];
  appLaunches?: boolean;
  open?: (bundlePath: string) => Promise<void>;
}

function fakeDeps(options: FakeOptions = {}) {
  const calls: string[] = [];
  let clock = 0;
  let polls = 0;
  const opens: { bundlePath: string; newInstance: boolean }[] = [];
  const deps: RestartDeps = {
    terminate: async (target, mode) => {
      calls.push(`terminate:${target.pid}:${mode}`);
      return options.terminate ? options.terminate(target) : { status: "requested" };
    },
    isRunning: async (pid) => {
      calls.push(`isRunning:${pid}`);
      return polls++ < (options.pollsUntilExit ?? 1);
    },
    listRunning: async () => {
      calls.push("listRunning");
      return [
        ...(options.running ?? []),
        ...(options.appLaunches === false ? [] : opens.map(({ bundlePath }) => raw({ pid: 9100, bundlePath }))),
      ];
    },
    open: async (bundlePath, openOptions) => {
      calls.push(`open:${bundlePath}`);
      opens.push({ bundlePath, ...openOptions });
      if (options.open) await options.open(bundlePath);
    },
    sleep: async (ms) => {
      clock += ms;
    },
    now: () => clock,
  };
  return { deps, calls, opens, elapsed: () => clock };
}

function raw(overrides: Partial<RawRunningApp>): RawRunningApp {
  return {
    pid: 1,
    name: app.name,
    bundleId: app.bundleId,
    bundlePath: app.bundlePath,
    executablePath: app.executablePath,
    activationPolicy: 0,
    terminated: false,
    ...overrides,
  };
}

describe("RestartCoordinator", () => {
  it("quits, waits for the selected PID to exit, then reopens the exact bundle in order", async () => {
    const { deps, calls, opens } = fakeDeps({ pollsUntilExit: 2 });
    const stages: RestartStage[] = [];
    const result = await new RestartCoordinator(deps).restart(app, {
      mode: "graceful",
      onProgress: (stage) => stages.push(stage),
    });

    assert.deepEqual(result, { ok: true, outcome: "relaunched" });
    assert.deepEqual(stages, ["quitting", "waiting", "reopening"]);
    assert.deepEqual(calls, [
      "terminate:4242:graceful",
      "isRunning:4242",
      "isRunning:4242",
      "isRunning:4242",
      "listRunning",
      `open:${app.bundlePath}`,
      "listRunning",
    ]);
    assert.deepEqual(opens, [{ bundlePath: app.bundlePath, newInstance: false }]);
  });

  it("does not quit or reopen anything when the selection is stale", async () => {
    const { deps, calls } = fakeDeps({
      terminate: async () => ({ status: "stale", detail: "process 4242 now belongs to /Applications/Other.app" }),
    });
    const result = await new RestartCoordinator(deps).restart(app, { mode: "graceful" });

    assert.deepEqual(result, {
      ok: false,
      reason: "stale",
      detail: "process 4242 now belongs to /Applications/Other.app",
    });
    assert.deepEqual(calls, ["terminate:4242:graceful"]);
    assert.match(describeResult(app, "graceful", result).title, /Changed Since the List Loaded/);
  });

  it("gives up after the graceful timeout without reopening", async () => {
    const { deps, calls, elapsed } = fakeDeps({ pollsUntilExit: Infinity });
    const result = await new RestartCoordinator(deps).restart(app, { mode: "graceful" });

    assert.deepEqual(result, { ok: false, reason: "quitTimeout" });
    assert.ok(elapsed() >= QUIT_TIMEOUT_MS.graceful, "waited for the full timeout");
    assert.ok(elapsed() < QUIT_TIMEOUT_MS.graceful + 1_000, "wait is bounded");
    assert.ok(!calls.some((call) => call.startsWith("open:")), "nothing reopened");
    assert.match(describeResult(app, "graceful", result).message ?? "", /unsaved changes/);
  });

  it("reports a refused quit separately from a timeout", async () => {
    const { deps, calls } = fakeDeps({ terminate: async () => ({ status: "refused" }) });
    const result = await new RestartCoordinator(deps).restart(app, { mode: "graceful" });

    assert.deepEqual(result, { ok: false, reason: "quitRefused" });
    assert.deepEqual(calls, ["terminate:4242:graceful"]);
  });

  it("reports a quit error when terminate throws", async () => {
    const { deps } = fakeDeps({
      terminate: async () => {
        throw new Error("osascript crashed");
      },
    });
    const result = await new RestartCoordinator(deps).restart(app, { mode: "graceful" });
    assert.deepEqual(result, { ok: false, reason: "quitFailed", detail: "osascript crashed" });
  });

  it("cancels a force restart when confirmation is declined, without terminating", async () => {
    const { deps, calls } = fakeDeps();
    const coordinator = new RestartCoordinator(deps);
    const result = await coordinator.restart(app, { mode: "force", confirm: async () => false });

    assert.deepEqual(result, { ok: false, reason: "cancelled" });
    assert.deepEqual(calls, []);
    assert.equal(coordinator.isBusy(app), false, "guard released after cancel");
  });

  it("refuses a force restart that has no confirmation step", async () => {
    const { deps, calls } = fakeDeps();
    const result = await new RestartCoordinator(deps).restart(app, { mode: "force" });
    assert.deepEqual(result, { ok: false, reason: "cancelled" });
    assert.deepEqual(calls, []);
  });

  it("force terminates after confirmation", async () => {
    const { deps, calls } = fakeDeps();
    const result = await new RestartCoordinator(deps).restart(app, { mode: "force", confirm: async () => true });
    assert.deepEqual(result, { ok: true, outcome: "relaunched" });
    assert.equal(calls[0], "terminate:4242:force");
  });

  it("distinguishes a reopen failure from a quit failure", async () => {
    const { deps } = fakeDeps({
      open: async () => {
        throw new Error("LSOpenURLsWithRole() failed with error -10810");
      },
    });
    const result = await new RestartCoordinator(deps).restart(app, { mode: "graceful" });

    assert.deepEqual(result, {
      ok: false,
      reason: "reopenFailed",
      detail: "LSOpenURLsWithRole() failed with error -10810",
    });
    assert.match(describeResult(app, "graceful", result).title, /Quit but Didn't Reopen/);
  });

  it("reports a reopen failure if launching returns but the selected bundle never appears", async () => {
    const { deps } = fakeDeps({ appLaunches: false, running: [raw({ bundlePath: "/Applications/Copy.app" })] });
    const result = await new RestartCoordinator(deps).restart(app, { mode: "graceful" });

    assert.deepEqual(result, {
      ok: false,
      reason: "reopenFailed",
      detail: "The selected app did not appear after reopening.",
    });
  });

  it("rejects a concurrent restart of the same bundle and allows it again afterwards", async () => {
    let releaseTerminate: () => void = () => {};
    const { deps, calls } = fakeDeps({
      terminate: () =>
        new Promise((resolve) => {
          releaseTerminate = () => resolve({ status: "requested" });
        }),
    });
    const coordinator = new RestartCoordinator(deps);
    const secondInstance = { ...app, pid: 5151 };

    const first = coordinator.restart(app, { mode: "graceful" });
    assert.equal(coordinator.isBusy(app), true);
    const second = await coordinator.restart(secondInstance, { mode: "graceful" });
    const forced = await coordinator.restart(app, { mode: "force", confirm: async () => true });

    assert.deepEqual(second, { ok: false, reason: "busy" });
    assert.deepEqual(forced, { ok: false, reason: "busy" });
    releaseTerminate();
    assert.deepEqual(await first, { ok: true, outcome: "relaunched" });
    assert.equal(calls.filter((call) => call.startsWith("terminate:")).length, 1);
    assert.equal(coordinator.isBusy(app), false);
  });

  it("does not block restarts of a different bundle", async () => {
    let releaseTerminate: () => void = () => {};
    const { deps } = fakeDeps({
      pollsUntilExit: 0,
      terminate: (target) =>
        target.pid === app.pid
          ? new Promise((resolve) => {
              releaseTerminate = () => resolve({ status: "requested" });
            })
          : Promise.resolve({ status: "requested" }),
    });
    const coordinator = new RestartCoordinator(deps);
    const pending = coordinator.restart(app, { mode: "graceful" });
    const other = { ...app, pid: 7, bundleId: "com.example.Other", bundlePath: "/Applications/Other.app" };

    assert.deepEqual(await coordinator.restart(other, { mode: "graceful" }), { ok: true, outcome: "relaunched" });
    releaseTerminate();
    assert.equal((await pending).ok, true);
  });

  it("activates instead of duplicating when the same copy is already running again", async () => {
    const { deps, opens } = fakeDeps({ running: [raw({ pid: 9001 })] });
    const result = await new RestartCoordinator(deps).restart(app, { mode: "graceful" });

    assert.deepEqual(result, { ok: true, outcome: "activatedExisting" });
    assert.deepEqual(opens, [{ bundlePath: app.bundlePath, newInstance: false }]);
  });

  it("forces a new instance of the selected copy when another copy shares the bundle ID", async () => {
    const { deps, opens } = fakeDeps({
      running: [raw({ pid: 9002, bundlePath: "/Users/me/Downloads/TextEdit.app" })],
    });
    await new RestartCoordinator(deps).restart(app, { mode: "graceful" });
    assert.deepEqual(opens, [{ bundlePath: app.bundlePath, newInstance: true }]);
  });

  it("ignores the old PID and terminated entries when checking for duplicates", async () => {
    const { deps, opens } = fakeDeps({
      running: [raw({ pid: app.pid }), raw({ pid: 77, terminated: true })],
    });
    const result = await new RestartCoordinator(deps).restart(app, { mode: "graceful" });
    assert.deepEqual(result, { ok: true, outcome: "relaunched" });
    assert.deepEqual(opens, [{ bundlePath: app.bundlePath, newInstance: false }]);
  });
});
