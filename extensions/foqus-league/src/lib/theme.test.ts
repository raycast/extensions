import assert from "node:assert/strict";
import { test } from "node:test";
import { luminance } from "./svg.ts";
import { dark, light, themeFor, tierFor, tiersFor } from "./theme.ts";

const LADDER = tiersFor([600, 1200, 2400]);

test("tiersFor builds the four tiers, Bronze always at zero", () => {
  assert.deepEqual(
    LADDER.map((t) => [t.name, t.min]),
    [
      ["Bronze", 0],
      ["Silver", 600],
      ["Gold", 1200],
      ["Diamond", 2400],
    ],
  );
  assert.deepEqual(
    tiersFor([1, 2, 3]).map((t) => t.min),
    [0, 1, 2, 3],
  );
});

test("tiersFor hands back a fresh ladder each call", () => {
  assert.notEqual(tiersFor([600, 1200, 2400])[0], LADDER[0]);
});

test("tierFor holds a tier from its threshold up to the next one", () => {
  const at = (m: number) => tierFor(m, LADDER);
  assert.equal(at(0).tier.name, "Bronze");
  assert.equal(at(599).tier.name, "Bronze");
  assert.equal(at(600).tier.name, "Silver");
  assert.equal(at(1199).tier.name, "Silver");
  assert.equal(at(1200).tier.name, "Gold");
  assert.equal(at(2399).tier.name, "Gold");
  assert.equal(at(2400).tier.name, "Diamond");
});

test("tierFor reports the index and the tier above", () => {
  assert.equal(tierFor(0, LADDER).index, 0);
  assert.equal(tierFor(0, LADDER).next?.name, "Silver");
  assert.equal(tierFor(600, LADDER).index, 1);
  assert.equal(tierFor(1200, LADDER).index, 2);
  assert.equal(tierFor(2400, LADDER).index, 3);
});

test("above the top tier there is nothing left to reach", () => {
  const top = tierFor(999_999, LADDER);
  assert.equal(top.tier.name, "Diamond");
  assert.equal(top.next, null);
  assert.equal(top.index, LADDER.length - 1);
});

test("a zero week, and an impossible negative one, sit in Bronze", () => {
  assert.equal(tierFor(0, LADDER).tier.name, "Bronze");
  assert.equal(tierFor(-10, LADDER).tier.name, "Bronze");
  assert.equal(tierFor(-10, LADDER).index, 0);
});

test("tierFor returns tiers by identity, so a render can compare them", () => {
  assert.equal(tierFor(1200, LADDER).tier, LADDER[2]);
  assert.equal(tierFor(1199, LADDER).next, LADDER[2]);
});

test("tierFor follows a custom ladder", () => {
  const custom = tiersFor([60, 120, 180]);
  assert.equal(tierFor(600, custom).tier.name, "Diamond");
  assert.equal(tierFor(59, custom).tier.name, "Bronze");
});

test("themeFor picks by appearance", () => {
  assert.equal(themeFor("dark"), dark);
  assert.equal(themeFor("light"), light);
});

test("both themes carry one league colour per tier and five heat steps", () => {
  for (const theme of [light, dark]) {
    assert.equal(theme.league.length, LADDER.length);
    assert.equal(theme.heat.length, 5);
    for (const [key, value] of Object.entries(theme)) {
      for (const colour of Array.isArray(value) ? value : [value]) {
        if (key === "name" || key === "font") continue;
        assert.match(colour as string, /^#[0-9a-f]{6}$/, `${theme.name}.${key}`);
      }
    }
  }
});

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test("each heat ramp climbs in one direction, with the empty day nearest its own ground", () => {
  for (const theme of [light, dark]) {
    const lums = theme.heat.map(luminance);
    const rising = lums.every((v, i) => i === 0 || v > lums[i - 1]);
    const falling = lums.every((v, i) => i === 0 || v < lums[i - 1]);

    assert.ok(rising || falling, `${theme.name}.heat is not monotonic: ${lums.map((l) => l.toFixed(3)).join(", ")}`);
    assert.ok(
      contrast(theme.heat[0], theme.surface) < contrast(theme.heat[4], theme.surface),
      `${theme.name}: an empty day must sit closer to the surface than the heaviest one`,
    );
  }
});

test("the heaviest day is legible against the surface it is drawn on", () => {
  for (const theme of [light, dark]) {
    assert.ok(
      contrast(theme.heat[4], theme.surface) >= 3,
      `${theme.name}: level 4 is ${contrast(theme.heat[4], theme.surface).toFixed(2)}:1 against the surface`,
    );
  }
});
