import { test } from "node:test";
import assert from "node:assert/strict";
import { FASTENERS } from "../src/data";
import { DRILLS, nearestDrill, fractionName } from "../src/data/drills";

const drillByName = new Map(DRILLS.map((d) => [d.name, d.dia]));

test("drill table has all number, letter, and fractional sizes", () => {
  assert.equal(drillByName.get("#80"), 0.0135);
  assert.equal(drillByName.get("#1"), 0.228);
  assert.equal(drillByName.get("A"), 0.234);
  assert.equal(drillByName.get("Z"), 0.413);
  assert.equal(drillByName.get("1/64"), 0.0156);
  assert.equal(drillByName.get("1/2"), 0.5);
  assert.equal(drillByName.get("1-1/2"), 1.5);
  assert.equal(fractionName(2), "1/32");
  assert.equal(fractionName(96), "1-1/2");
});

test("drill table is strictly ascending with no duplicate names", () => {
  for (let i = 1; i < DRILLS.length; i++) assert.ok(DRILLS[i].dia >= DRILLS[i - 1].dia, DRILLS[i].name);
  assert.equal(new Set(DRILLS.map((d) => d.name)).size, DRILLS.length);
});

test("nearestDrill picks the closest size", () => {
  assert.equal(nearestDrill(0.1969).name, "#9");
  assert.equal(nearestDrill(0.26).name, "G");
  assert.equal(nearestDrill(0.5).name, "1/2");
});

for (const f of FASTENERS) {
  test(`${f.size}: imperial drill names agree with the drill table`, () => {
    if (f.system !== "imperial") return;
    for (const t of f.threads) {
      assert.ok(t.tapDrillName, `${t.designation} missing drill name`);
      assert.equal(drillByName.get(t.tapDrillName!), t.tapDrill, `${t.designation} tap drill ${t.tapDrillName}`);
    }
    for (const fit of ["close", "normal", "loose"] as const) {
      const h = f.clearance[fit];
      assert.ok(h.name, `${f.size} ${fit} missing drill name`);
      assert.equal(drillByName.get(h.name!), h.dia, `${f.size} ${fit} ${h.name}`);
    }
  });

  test(`${f.size}: tap drill sits between minor and major diameter`, () => {
    for (const t of f.threads) {
      const p = t.pitch ?? 1 / t.tpi!;
      const minor = f.majorDia - 1.0825 * p;
      assert.ok(t.tapDrill < f.majorDia, `${t.designation} tap ${t.tapDrill} >= major ${f.majorDia}`);
      assert.ok(t.tapDrill >= minor - 0.02 * f.majorDia, `${t.designation} tap ${t.tapDrill} far below minor ${minor}`);
    }
  });

  test(`${f.size}: clearance holes are ordered and larger than major`, () => {
    const { close, normal, loose } = f.clearance;
    assert.ok(close.dia > f.majorDia, "close > major");
    assert.ok(normal.dia > close.dia, "normal > close");
    assert.ok(loose.dia > normal.dia, "loose > normal");
    assert.ok(loose.dia < f.majorDia * 1.35, "loose not absurd");
  });

  test(`${f.size}: counterbore clears the head`, () => {
    if (!f.counterbore) return;
    const c = f.counterbore;
    assert.ok(c.headDia > f.majorDia, "head > major");
    assert.ok(c.dia > c.headDia, "cbore > head");
    assert.equal(c.depth, c.headHeight);
    assert.ok(Math.abs(c.headHeight - f.majorDia) < 0.02 * f.majorDia + 0.001, "SHCS head height ≈ nominal dia");
  });

  test(`${f.size}: thread designations and series are well-formed`, () => {
    assert.ok(f.threads.length >= 1);
    if (f.size !== "#0") assert.equal(f.threads[0].series, "coarse", `${f.size} first thread should be coarse`);
    for (const t of f.threads) {
      if (f.system === "imperial") assert.match(t.designation, /^(#\d+|\d+(\/\d+)?)-\d+ UN[CF]$/);
      else assert.match(t.designation, /^M\d+(\.\d+)?x\d+\.\d+$/);
    }
  });
}

test("imperial numbered sizes follow 0.060 + 0.013n", () => {
  for (const f of FASTENERS.filter((x) => x.size.startsWith("#"))) {
    const n = Number(f.size.slice(1));
    assert.ok(Math.abs(f.majorDia - (0.06 + 0.013 * n)) < 1e-9, f.size);
  }
});

test("metric tap drills equal major minus pitch (within 0.15 mm)", () => {
  for (const f of FASTENERS.filter((x) => x.system === "metric")) {
    for (const t of f.threads) {
      assert.ok(Math.abs(t.tapDrill - (f.majorDia - t.pitch!)) <= 0.15, t.designation);
    }
  }
});

test("#0 is fine-only and every other size has a coarse thread", () => {
  const zero = FASTENERS.find((f) => f.size === "#0")!;
  assert.deepEqual(
    zero.threads.map((t) => t.designation),
    ["#0-80 UNF"],
  );
});
