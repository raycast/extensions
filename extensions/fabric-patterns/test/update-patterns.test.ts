// The Update Fabric Patterns command: a root-search command that runs fabric --updatepatterns
// with no view, proven from the strict fake's log, and reports the outcome (HUD or failure toast).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { fake, resetFake, tmp } from "./raycast-mock";

const FAKE = join(import.meta.dir, "fake-fabric.sh");
const { readText } = await import("../lib/loaders");
const { stateFor } = await import("../lib/states");
const { shownText } = await import("../src/deliver");
const { default: Command, FAILURE_LINGER_MS } = await import("../src/update-patterns");
// The failure path waits FAILURE_LINGER_MS; tests run it with no wait unless they test the wait.
const UpdatePatterns = (lingerMs = 0) => Command(undefined, lingerMs);

const ENV = ["FAKE_FABRIC_LOG", "FAKE_FABRIC_EXIT", "FAKE_FABRIC_STDERR"] as const;
const saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
let log = "";
beforeEach(() => {
  resetFake();
  fake.prefs = { fabricPath: FAKE, saveFolder: tmp, defaultOutput: "clipboard" };
  log = join(tmp, `log-${Math.random().toString(36).slice(2)}`);
  process.env.FAKE_FABRIC_LOG = log;
});
afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

// The failure as showToast received it (see src/update-patterns.tsx).
const failure = () => fake.shown.find((t) => t.style === "failure");
const failWith = (code: string, stderr?: string) => {
  process.env.FAKE_FABRIC_EXIT = code;
  if (stderr) process.env.FAKE_FABRIC_STDERR = stderr;
};

describe("Update Fabric Patterns command", () => {
  test("runs only fabric --updatepatterns, asks nothing, and says so in a HUD", async () => {
    fake.confirm = false; // a confirm would answer no and stop the run
    await UpdatePatterns();
    expect(readText(log)).toBe("--updatepatterns\n");
    expect(fake.huds).toEqual(["Fabric patterns updated"]);
    expect(failure()).toBeUndefined();
    expect(fake.hidden).toEqual(fake.toasts); // the progress toast doesn't outlive the command either
  });

  // Revert to setters on the progress toast → the style list and every failure() field below fail.
  test("a failed update replaces the progress toast with a failure carrying fabric's error and the path fix", async () => {
    failWith("1", "could not reach github.com\nsecond line");
    await UpdatePatterns();
    expect(readText(log)).toBe("--updatepatterns\n");
    expect(fake.huds).toEqual([]);
    expect(fake.shown.map((t) => t.style)).toEqual(["animated", "failure"]);
    // Progress hidden before the failure shows; the failure hidden once the wait ends (ISC-99.6).
    expect(fake.hidden).toEqual(fake.toasts);
    expect(failure()).toMatchObject({
      title: "Couldn't update patterns",
      message: "could not reach github.com\nsecond line",
      primaryAction: { title: "Open Preferences" },
    });
  });

  // Shown once the failure is up, then clicked so the run ends.
  const failedRun = async (stderr = "offline") => {
    failWith("1", stderr);
    const run = UpdatePatterns(FAILURE_LINGER_MS);
    for (let i = 0; i < 200 && !failure(); i++) await Bun.sleep(5);
    const handle = fake.toasts.find((t) => t.style === "failure");
    expect(handle?.primaryAction?.onAction).toBeFunction();
    return { run, click: () => handle?.primaryAction?.onAction?.(handle) };
  };

  // Drop the wait → the run is already done when the failure shows. Make success wait → over 1 s.
  test("a failure keeps the command loaded so its action can still run, and success doesn't wait", async () => {
    const ok = performance.now();
    await UpdatePatterns(5_000);
    expect(performance.now() - ok).toBeLessThan(1_000);
    const { run, click } = await failedRun();
    expect(await Promise.race([run.then(() => "done"), Bun.sleep(30).then(() => "loaded")])).toBe("loaded");
    expect(fake.hidden).not.toContain(fake.toasts.at(-1)); // the failure stays up while its action works (hide it before the wait → this fails)
    click();
    await run;
    expect(fake.hidden.at(-1)).toBe(fake.toasts.at(-1)); // then the failure goes, so it never lingers stale
  });

  // Click doesn't end the wait → the run outlasts the 5 s test timeout. Click resolves before the
  // action settles, or skips it → prefsOpened is 0 when the run ends.
  test("clicking the failure's action runs it and lets the command finish before the wait ends", async () => {
    const { run, click } = await failedRun();
    expect(fake.prefsOpened).toBe(0); // a late open from an earlier test would land here
    click();
    await run;
    expect(fake.prefsOpened).toBe(1);
  });

  // try/finally around the action swapped for plain calls → the wait outlasts the test timeout.
  test("an action that fails still ends the wait, reports its error and hides the toast", async () => {
    fake.failCopy = true;
    const { run, click } = await failedRun("error loading .env file"); // offers Copy Setup Command
    await expect(Promise.resolve(click())).rejects.toThrow("clipboard unavailable");
    await run;
    expect(fake.hidden.at(-1)).toBe(fake.toasts.at(-1));
  });

  test("a failure with no error text names the exit code", async () => {
    failWith("3");
    await UpdatePatterns();
    expect(failure()?.message).toBe("fabric exited with code 3");
  });

  test("a model-run label never names an update failure: a 429 stays fabric's own words", async () => {
    failWith("1", "HTTP Error 429: too many requests");
    await UpdatePatterns();
    expect(failure()?.message).toBe("HTTP Error 429: too many requests");
  });

  test("fabric not set up offers its setup command, on the Fabric Path", async () => {
    failWith("1", "error loading .env file");
    await UpdatePatterns();
    // Shown with the home folder as ~; copied whole, so it runs as pasted.
    expect(failure()?.message).toBe(shownText(stateFor("no-model", { fabricPath: FAKE }).description ?? ""));
    expect(failure()?.message).toContain("fake-fabric.sh --setup");
    expect(failure()?.primaryAction?.title).toBe("Copy Setup Command");
    await failure()?.primaryAction?.onAction?.(failure() as never);
    expect(fake.copied).toEqual([`${FAKE} --setup`]);
  });

  test("a fabric path that isn't a runnable file spawns nothing and offers Preferences", async () => {
    for (const fabricPath of [join(tmp, "no-such-fabric"), tmp, "fabric-ai"]) {
      resetFake();
      fake.prefs = { fabricPath, saveFolder: tmp, defaultOutput: "clipboard" };
      await UpdatePatterns();
      expect(failure()?.message).toBe(stateFor("fabric-missing", { fabricPath }).description);
      expect(failure()?.primaryAction?.title).toBe("Open Preferences");
    }
    expect(readText(log)).toBeUndefined();
  });

  test("a relative path to a real fabric is still refused, never thrown from the spawn", async () => {
    const cwd = process.cwd();
    copyFileSync(FAKE, join(tmp, "fabric-rel"));
    chmodSync(join(tmp, "fabric-rel"), 0o755);
    process.chdir(tmp);
    try {
      fake.prefs = { ...fake.prefs, fabricPath: "fabric-rel" };
      await UpdatePatterns();
      expect(failure()?.message).toBe(stateFor("fabric-missing", { fabricPath: "fabric-rel" }).description);
      expect(readText(log)).toBeUndefined();
    } finally {
      process.chdir(cwd);
    }
  });
});
