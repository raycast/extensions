import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addTime,
  finishTimer,
  getProgress,
  getRemainingMs,
  isDue,
  newTimer,
  pauseTimer,
  pushRecent,
  readState,
  renameWithRetry,
  restartTimer,
  resumeTimer,
  settle,
  updateState,
  writeState,
} from "../src/lib/state.ts";
import { EMPTY_STATE } from "../src/lib/types.ts";
import type { SandglassState } from "../src/lib/types.ts";

const MIN = 60_000;
const T0 = 1_000_000;

const fresh = () => newTimer(10 * MIN, T0, "Tea", "id-1", "tok-1");

describe("newTimer", () => {
  it("starts running", () => {
    assert.deepEqual(fresh(), {
      id: "id-1",
      label: "Tea",
      durationMs: 10 * MIN,
      startedAt: T0,
      endsAt: T0 + 10 * MIN,
      remainingMs: 10 * MIN,
      status: "running",
      token: "tok-1",
    });
  });

  it("generates id and token by default and omits an empty label", () => {
    const a = newTimer(MIN, T0);
    const b = newTimer(MIN, T0);
    assert.notEqual(a.id, b.id);
    assert.notEqual(a.token, b.token);
    assert.equal("label" in a, false);
  });
});

describe("getRemainingMs, getProgress, isDue", () => {
  it("computes remaining time per status", () => {
    const t = fresh();
    assert.equal(getRemainingMs(t, T0 + 4 * MIN), 6 * MIN);
    assert.equal(getRemainingMs(t, T0 + 20 * MIN), 0);
    assert.equal(getRemainingMs(pauseTimer(t, T0 + 4 * MIN), T0 + 99 * MIN), 6 * MIN);
    assert.equal(getRemainingMs(finishTimer(t, T0), T0), 0);
  });

  it("computes progress clamped to 0..1", () => {
    const t = fresh();
    assert.equal(getProgress(t, T0), 1);
    assert.equal(getProgress(t, T0 + 5 * MIN), 0.5);
    assert.equal(getProgress(t, T0 + 50 * MIN), 0);
    assert.equal(getProgress(t, T0 - 5 * MIN), 1);
    assert.equal(getProgress({ ...t, durationMs: 0 }, T0), 0);
  });

  it("is due only when running and the end time has been reached", () => {
    const t = fresh();
    assert.equal(isDue(t, T0 + 10 * MIN - 1), false);
    assert.equal(isDue(t, T0 + 10 * MIN), true);
    assert.equal(isDue(pauseTimer(t, T0), T0 + 99 * MIN), false);
    assert.equal(isDue(finishTimer(t, T0), T0 + 99 * MIN), false);
  });
});

describe("pause and resume", () => {
  it("freezes the remaining time and clears the alert pid", () => {
    const t = { ...fresh(), alertPid: 123 };
    const p = pauseTimer(t, T0 + 4 * MIN);
    assert.equal(p.status, "paused");
    assert.equal(p.remainingMs, 6 * MIN);
    assert.equal(p.alertPid, undefined);
    assert.equal(t.status, "running");
    assert.equal(t.alertPid, 123);
  });

  it("leaves non-running timers unchanged", () => {
    const p = pauseTimer(fresh(), T0);
    assert.equal(pauseTimer(p, T0 + MIN), p);
    const f = finishTimer(fresh(), T0);
    assert.equal(pauseTimer(f, T0), f);
  });

  it("resumes from the frozen remaining time with a new token", () => {
    const p = pauseTimer(fresh(), T0 + 4 * MIN);
    const r = resumeTimer(p, T0 + 30 * MIN, "tok-2");
    assert.equal(r.status, "running");
    assert.equal(r.endsAt, T0 + 36 * MIN);
    assert.equal(r.token, "tok-2");
    assert.equal(getRemainingMs(r, T0 + 30 * MIN), 6 * MIN);
  });

  it("does not resume a running timer", () => {
    const t = fresh();
    assert.equal(resumeTimer(t, T0 + MIN, "x"), t);
  });
});

describe("addTime", () => {
  it("extends a running timer", () => {
    const a = addTime(fresh(), 5 * MIN, T0 + MIN, "tok-2");
    assert.equal(a.endsAt, T0 + 15 * MIN);
    assert.equal(a.durationMs, 15 * MIN);
    assert.equal(a.token, "tok-2");
    assert.equal(a.status, "running");
  });

  it("extends a paused timer without changing the token", () => {
    const p = pauseTimer(fresh(), T0 + 4 * MIN);
    const a = addTime(p, 5 * MIN, T0 + 9 * MIN, "tok-2");
    assert.equal(a.status, "paused");
    assert.equal(a.remainingMs, 11 * MIN);
    assert.equal(a.durationMs, 15 * MIN);
    assert.equal(a.token, p.token);
  });

  it("restarts a finished timer with just the added time", () => {
    const f = finishTimer(fresh(), T0 + 10 * MIN);
    const a = addTime(f, 5 * MIN, T0 + 12 * MIN, "tok-2");
    assert.equal(a.status, "running");
    assert.equal(a.startedAt, T0 + 12 * MIN);
    assert.equal(a.endsAt, T0 + 17 * MIN);
    assert.equal(a.durationMs, 5 * MIN);
    assert.equal(a.remainingMs, 5 * MIN);
    assert.equal(a.finishedAt, undefined);
    assert.equal(a.token, "tok-2");
  });
});

describe("restartTimer and finishTimer", () => {
  it("restarts from the full duration", () => {
    const f = finishTimer(fresh(), T0 + 10 * MIN);
    const r = restartTimer(f, T0 + 20 * MIN, "tok-2");
    assert.equal(r.status, "running");
    assert.equal(r.startedAt, T0 + 20 * MIN);
    assert.equal(r.endsAt, T0 + 30 * MIN);
    assert.equal(r.remainingMs, 10 * MIN);
    assert.equal(r.finishedAt, undefined);
    assert.equal(r.token, "tok-2");
  });

  it("finishes with the given time", () => {
    const t = { ...fresh(), alertPid: 9 };
    const f = finishTimer(t, T0 + 10 * MIN);
    assert.equal(f.status, "finished");
    assert.equal(f.finishedAt, T0 + 10 * MIN);
    assert.equal(f.remainingMs, 0);
    assert.equal(f.alertPid, undefined);
  });

  it("is immutable", () => {
    const t = fresh();
    const copy = structuredClone(t);
    pauseTimer(t, T0 + MIN);
    addTime(t, MIN, T0, "x");
    restartTimer(t, T0, "x");
    finishTimer(t, T0);
    assert.deepEqual(t, copy);
  });
});

describe("settle", () => {
  it("finishes due running timers at their own end time", () => {
    const due = newTimer(MIN, T0, undefined, "due", "a");
    const later = newTimer(20 * MIN, T0, undefined, "later", "b");
    const paused = pauseTimer(newTimer(MIN, T0, undefined, "paused", "c"), T0);
    const state: SandglassState = { version: 1, timers: [due, later, paused], recent: [MIN] };

    const settled = settle(state, T0 + 5 * MIN);
    assert.notEqual(settled, state);
    assert.equal(settled.timers[0].status, "finished");
    assert.equal(settled.timers[0].finishedAt, T0 + MIN);
    assert.equal(settled.timers[1], later);
    assert.equal(settled.timers[2], paused);
    assert.deepEqual(settled.recent, [MIN]);
    assert.equal(state.timers[0].status, "running");
  });

  it("returns the same object when nothing is due", () => {
    const state: SandglassState = { version: 1, timers: [fresh()], recent: [] };
    assert.equal(settle(state, T0 + MIN), state);
    assert.equal(settle(EMPTY_STATE, T0), EMPTY_STATE);
  });
});

describe("pushRecent", () => {
  it("puts the newest first and removes duplicates", () => {
    assert.deepEqual(pushRecent([1, 2, 3], 4), [4, 1, 2, 3]);
    assert.deepEqual(pushRecent([1, 2, 3], 3), [3, 1, 2]);
  });

  it("keeps at most five", () => {
    assert.deepEqual(pushRecent([1, 2, 3, 4, 5], 6), [6, 1, 2, 3, 4]);
  });

  it("does not mutate its input", () => {
    const recent = [1, 2];
    pushRecent(recent, 3);
    assert.deepEqual(recent, [1, 2]);
  });
});

describe("storage", () => {
  const dir = mkdtempSync(join(tmpdir(), "sandglass-test-"));
  after(() => rmSync(dir, { recursive: true, force: true }));

  it("returns a fresh empty state for a missing file", () => {
    const state = readState(join(dir, "missing.json"));
    assert.deepEqual(state, EMPTY_STATE);
    assert.notEqual(state, EMPTY_STATE);
    assert.notEqual(state.timers, EMPTY_STATE.timers);
  });

  it("returns an empty state for corrupt JSON", () => {
    const file = join(dir, "corrupt.json");
    writeFileSync(file, "{not json");
    assert.deepEqual(readState(file), EMPTY_STATE);
    writeFileSync(file, "42");
    assert.deepEqual(readState(file), EMPTY_STATE);
    writeFileSync(file, "null");
    assert.deepEqual(readState(file), EMPTY_STATE);
  });

  it("drops invalid timers and bad recent entries", () => {
    const file = join(dir, "loose.json");
    const good = fresh();
    writeFileSync(
      file,
      JSON.stringify({ timers: [good, { id: "x" }, null, { ...good, status: "weird" }], recent: [1, "a", 1, 2, -3] }),
    );
    assert.deepEqual(readState(file), { version: 1, timers: [good], recent: [1, 2] });
  });

  it("writes atomically, creating directories, and reads back", () => {
    const file = join(dir, "nested", "deeper", "state.json");
    const state: SandglassState = { version: 1, timers: [fresh()], recent: [MIN] };
    writeState(file, state);
    assert.equal(existsSync(`${file}.tmp`), false);
    assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), state);
    assert.deepEqual(readState(file), state);
  });

  it("updateState reads, applies, writes and returns", () => {
    const file = join(dir, "update.json");
    const next = updateState(file, (s) => ({ ...s, recent: pushRecent(s.recent, 5 * MIN) }));
    assert.deepEqual(next.recent, [5 * MIN]);
    const again = updateState(file, (s) => ({ ...s, recent: pushRecent(s.recent, 10 * MIN) }));
    assert.deepEqual(again.recent, [10 * MIN, 5 * MIN]);
    assert.deepEqual(readState(file), again);
  });

  it("writes even while another process briefly has the file open", { skip: process.platform !== "win32" }, async () => {
    const file = join(dir, "locked.json");
    writeState(file, { version: 1, timers: [], recent: [] });
    // Opens the file the way Get-Content does (no delete sharing), holds it for 300 ms, then closes it.
    const script =
      `$f = [IO.File]::Open('${file}', 'Open', 'Read', 'ReadWrite'); [Console]::Out.WriteLine('open'); ` +
      `[Console]::Out.Flush(); Start-Sleep -Milliseconds 300; $f.Dispose()`;
    const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
    await new Promise<void>((resolve, reject) => {
      ps.stdout.on("data", (chunk: Buffer) => chunk.toString().includes("open") && resolve());
      ps.on("error", reject);
    });
    const state: SandglassState = { version: 1, timers: [fresh()], recent: [MIN] };
    writeState(file, state);
    assert.deepEqual(readState(file), state);
    await new Promise((resolve) => ps.on("close", resolve));
  });
});

describe("renameWithRetry", () => {
  const lockedError = (code: string) => Object.assign(new Error(code), { code });

  it("retries while the target is locked, then succeeds", () => {
    let calls = 0;
    const sleeps: number[] = [];
    renameWithRetry(
      "a",
      "b",
      () => {
        calls++;
        if (calls < 4) throw lockedError(calls === 2 ? "EBUSY" : "EPERM");
      },
      (ms) => sleeps.push(ms),
    );
    assert.equal(calls, 4);
    assert.deepEqual(sleeps, [10, 20, 30]);
  });

  it("gives up after the last attempt and rethrows", () => {
    let calls = 0;
    assert.throws(
      () =>
        renameWithRetry(
          "a",
          "b",
          () => {
            calls++;
            throw lockedError("EACCES");
          },
          () => undefined,
          5,
        ),
      /EACCES/,
    );
    assert.equal(calls, 5);
  });

  it("does not retry other errors", () => {
    let calls = 0;
    assert.throws(
      () =>
        renameWithRetry(
          "a",
          "b",
          () => {
            calls++;
            throw lockedError("ENOENT");
          },
          () => undefined,
        ),
      /ENOENT/,
    );
    assert.equal(calls, 1);
  });
});
