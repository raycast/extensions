import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { POKE_MINUTES } from "./collector.ts";
import { heartbeatMoved, isMenuBarOff, MENU_BAR_QUIET_MS, recentlyPinged } from "./menuBarHeartbeat.ts";

const UNIT_MS: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };

test("Menu Bar Stats counts as off when it never ran or missed two refreshes", () => {
  const now = Date.now();
  assert.equal(isMenuBarOff(undefined, now), true);
  assert.equal(isMenuBarOff(now - 24 * 60_000, now), false);
  assert.equal(isMenuBarOff(now - 26 * 60_000, now), true);
});

test("the quiet window outlasts two of the menu bar's refreshes, whatever the manifest says", () => {
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  const interval: string = manifest.commands.find((c: { name: string }) => c.name === "focus-menu-bar").interval;
  const [, count, unit] = /^(\d+)([smhd])$/.exec(interval)!;
  const refreshMs = Number(count) * UNIT_MS[unit];

  assert.ok(
    MENU_BAR_QUIET_MS > 2 * refreshMs,
    `a ${interval} refresh would flag a working menu bar as off between two runs`,
  );
  assert.ok(POKE_MINUTES * 60_000 > refreshMs, `pokes would stop between two ${interval} refreshes`);
});

test("a run that starts within 10 seconds of the collector's ping was poked, and nothing else counts", () => {
  const now = Date.now();
  assert.equal(recentlyPinged(undefined, now), false, "no ping file, no poke");
  assert.equal(recentlyPinged(now - 2_000, now), true);
  assert.equal(recentlyPinged(now - 30_000, now), false, "an old ping belongs to an earlier run");
  assert.equal(recentlyPinged(now + 5_000, now), false, "a ping from the future, after a clock change, is ignored");
});

test("a heartbeat that moves is seen on the read after it moves", async () => {
  const reads = [1, 1, 2];
  let pauses = 0;
  const moved = await heartbeatMoved(
    async () => reads.shift(),
    1,
    async () => pauses++,
    20,
  );

  assert.equal(moved, true);
  assert.equal(pauses, 3, "it stops polling as soon as the value changes");
});

test("a first heartbeat ever counts as a move", async () => {
  assert.equal(
    await heartbeatMoved(
      async () => 123,
      undefined,
      async () => undefined,
      1,
    ),
    true,
  );
});

test("a heartbeat that never moves gives up after the last try", async () => {
  let pauses = 0;
  const moved = await heartbeatMoved(
    async () => undefined,
    undefined,
    async () => pauses++,
    5,
  );

  assert.equal(moved, false);
  assert.equal(pauses, 5);
});
