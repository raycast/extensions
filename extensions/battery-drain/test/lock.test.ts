import { existsSync, mkdirSync, mkdtempSync, utimesSync } from "node:fs";
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
    // Either may take the lock first; what matters is that one leaves before the other enters.
    const first = order[0].split(" ")[0];
    const second = first === "a" ? "b" : "a";
    expect(order).toEqual([`${first} in`, `${first} out`, `${second} in`, `${second} out`]);
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

  it("creates a missing support folder instead of waiting out the timeout without a lock", async () => {
    const dir = join(mkdtempSync(join(tmpdir(), "bd-lock-")), "not", "yet");
    const started = Date.now();
    await dirLock(dir)(async () => {
      expect(existsSync(join(dir, "history.lock"))).toBe(true); // really held
    });
    expect(Date.now() - started).toBeLessThan(500);
  });

  it("does not remove a newer holder's lock when a stale holder finally finishes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bd-lock-"));
    const lock = dirLock(dir, { staleMs: 50, retryMs: 5 });
    let bHolding = false;
    let lockPresentWhileB = false;
    const a = lock(async () => {
      await tick(150); // outlives staleMs, e.g. the Mac slept mid-append
    });
    await tick(80);
    const b = lock(async () => {
      bHolding = true;
      await tick(120); // A finishes while B still holds
      lockPresentWhileB = existsSync(join(dir, "history.lock"));
    });
    await Promise.all([a, b]);
    expect(bHolding).toBe(true);
    expect(lockPresentWhileB).toBe(true);
  });
});
