import { mkdirSync, mkdtempSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dirLock } from "../src/history/lock";

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("dirLock", () => {
  it("runs one holder at a time", async () => {
    const lock = dirLock(mkdtempSync(join(tmpdir(), "bd-lock-")));
    const order: string[] = [];
    const task = (name: string) =>
      lock(async () => {
        order.push(`${name} in`);
        await tick(30);
        order.push(`${name} out`);
      });
    await Promise.all([task("a"), task("b")]);
    expect(order).toEqual(["a in", "a out", "b in", "b out"]);
  });

  it("takes over a lock left behind by a run that crashed", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bd-lock-"));
    const stale = join(dir, "history.lock");
    mkdirSync(stale);
    const old = new Date(Date.now() - 60_000);
    utimesSync(stale, old, old);
    let ran = false;
    await dirLock(dir)(async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });

  it("still runs when the lock cannot be taken in time, rather than losing the sample", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bd-lock-"));
    mkdirSync(join(dir, "history.lock")); // fresh and never released
    let ran = false;
    await dirLock(dir, { waitMs: 100 })(async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });
});
