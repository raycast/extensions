import { test } from "node:test";
import assert from "node:assert/strict";
import { DiceError, MAX_DICE, MAX_SIDES, parse, roll } from "../src/dice.ts";

/** Compact rendering of parsed terms, e.g. `["12d10", "1d6+3", "5"]`. */
function summarize(input: string): string[] {
  return parse(input).map((term) => {
    if ("constant" in term) {
      return String(term.constant);
    }
    const sign = term.modifier > 0 ? "+" : "";
    return `${term.count}d${term.sides}${term.modifier ? sign + term.modifier : ""}`;
  });
}

test("reads a single group", () => {
  assert.deepEqual(summarize("1d6"), ["1d6"]);
});

test("defaults the count to one die", () => {
  assert.deepEqual(summarize("d20"), ["1d20"]);
});

test("is case-insensitive", () => {
  assert.deepEqual(summarize("2D10"), ["2d10"]);
});

test("reads several groups", () => {
  assert.deepEqual(summarize("1d6 3d4 2d20"), ["1d6", "3d4", "2d20"]);
});

test("treats spaces, plus, and nothing as the same separator", () => {
  const expected = ["1d6", "2d10"];
  assert.deepEqual(summarize("1d6 2d10"), expected);
  assert.deepEqual(summarize("1d6+2d10"), expected);
  assert.deepEqual(summarize("1d6 + 2d10"), expected);
});

test("attaches a flush signed number to the group as a modifier", () => {
  assert.deepEqual(summarize("2d6+3"), ["2d6+3"]);
  assert.deepEqual(summarize("1d20+5"), ["1d20+5"]);
});

test("treats a separated number as a flat addition", () => {
  assert.deepEqual(summarize("1d20 5"), ["1d20", "5"]);
  assert.deepEqual(summarize("1d6 -2"), ["1d6", "-2"]);
});

test("sums several modifiers on one group", () => {
  assert.deepEqual(summarize("1d6+12-3"), ["1d6+9"]);
});

// Regression: `\d+` used to backtrack to a shorter match to satisfy the
// joiner lookahead, so `1d6+12d10` parsed as `1d6+1` plus `2d10` — rolling
// 2 dice instead of 12 — and `1d6 + 20d6` failed on a leftover `0d6`.
test("keeps multi-digit counts intact across a plus joiner", () => {
  assert.deepEqual(summarize("1d6+12d10"), ["1d6", "12d10"]);
  assert.deepEqual(summarize("1d6 + 20d6"), ["1d6", "20d6"]);
  assert.deepEqual(summarize("12d10+34d20"), ["12d10", "34d20"]);
});

test("reads multi-digit counts, sides, and modifiers", () => {
  assert.deepEqual(summarize("100d6"), ["100d6"]);
  assert.deepEqual(summarize("10d10+100"), ["10d10+100"]);
  assert.deepEqual(summarize("1d100"), ["1d100"]);
});

test("rejects unreadable input, naming the term at fault", () => {
  assert.throws(() => parse("banana"), { name: "Error", message: /"banana"/ });
  assert.throws(() => parse("1d6 xyz"), { message: /"xyz"/ });
  assert.throws(() => parse(""), DiceError);
});

test("rejects out-of-range dice", () => {
  assert.throws(() => parse("0d6"), { message: /at least 1 die/ });
  assert.throws(() => parse("1d0"), { message: /at least 1 side/ });
  assert.throws(() => parse(`${MAX_DICE + 1}d6`), { message: /limited to 1000 dice/ });
  assert.throws(() => parse(`1d${MAX_SIDES + 1}`), { message: /more than 1000000 sides/ });
});

test("allows the limits themselves", () => {
  assert.doesNotThrow(() => parse(`${MAX_DICE}d6`));
  assert.doesNotThrow(() => parse(`1d${MAX_SIDES}`));
});

// The dice limit guards the work one command can do, so it has to apply to the
// roll as a whole. Checked per group, `1000d6 1000d6` rolled 2000 dice, and
// each added group raised the count further.
test("counts dice across groups against the limit", () => {
  assert.throws(() => parse(`${MAX_DICE}d6 ${MAX_DICE}d6`), { message: /limited to 1000 dice/ });
  assert.throws(() => parse("600d6 600d6"), { message: /limited to 1000 dice/ });
  assert.throws(() => parse(Array(50).fill("1000d20").join(" ")), DiceError);
  assert.throws(() => parse("500d6+500d6+1d6"), { message: /limited to 1000 dice/ });
});

test("allows many groups that together stay within the limit", () => {
  assert.doesNotThrow(() => parse("500d6 500d6"));
  assert.doesNotThrow(() => parse("100d6 200d10 300d20 400d4"));
  assert.equal(roll("500d6 500d6").groups.reduce((n, group) => n + group.rolls.length, 0), 1000);
});

test("does not count flat additions as dice", () => {
  assert.doesNotThrow(() => parse(`${MAX_DICE}d6 500`));
  assert.doesNotThrow(() => parse(`${MAX_DICE}d6+500`));
});

test("rolls one die per requested die, each within range", () => {
  const result = roll("5d8");
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].rolls.length, 5);
  for (const value of result.groups[0].rolls) {
    assert.ok(value >= 1 && value <= 8, `${value} outside 1..8`);
  }
});

test("totals the rolls, modifiers, and flat additions", () => {
  const result = roll("3d6+2 10");
  const rolled = result.groups[0].rolls.reduce((sum, value) => sum + value, 0);
  assert.equal(result.groups[0].total, rolled + 2);
  assert.equal(result.total, rolled + 2 + 10);
});

test("covers every face of a d6 over many rolls", () => {
  const seen = new Set<number>();
  for (let i = 0; i < 2000; i++) {
    seen.add(roll("1d6").total);
  }
  assert.deepEqual([...seen].sort(), [1, 2, 3, 4, 5, 6]);
});
