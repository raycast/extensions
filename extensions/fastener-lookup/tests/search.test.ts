import { test } from "node:test";
import assert from "node:assert/strict";
import { search, Row } from "../src/search";

const has = (rows: Row[], pred: Partial<Row>) =>
  rows.some((r) => Object.entries(pred).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v));

const sections = (rows: Row[]) => [...new Set(rows.map((r) => r.section))];
const fasteners = (rows: Row[]) => [...new Set(rows.map((r) => r.fastener))];

test("#10 returns tap drills, clearance, cbore, and thread for #10 only", () => {
  const rows = search("#10");
  assert.deepEqual(fasteners(rows).filter((f) => !f.startsWith("#10")), []);
  assert.ok(has(rows, { section: "Tap Drill", fastener: "#10-24 UNC", value: 0.1495, drill: "#25" }));
  assert.ok(has(rows, { section: "Tap Drill", fastener: "#10-32 UNF", value: 0.159, drill: "#21" }));
  assert.ok(has(rows, { section: "Clearance Hole", label: "Close Fit", value: 0.196, drill: "#9" }));
  assert.ok(has(rows, { section: "Clearance Hole", label: "Normal Fit", value: 0.201, drill: "#7" }));
  assert.ok(has(rows, { section: "Clearance Hole", label: "Loose Fit", value: 0.213, drill: "#3" }));
  assert.ok(has(rows, { section: "Counterbore", label: "Diameter" }));
  assert.ok(has(rows, { section: "Thread", label: "Major Diameter", value: 0.19 }));
});

test("bare 10 matches #10 and M10", () => {
  const f = fasteners(search("10"));
  assert.ok(f.some((x) => x.startsWith("#10")));
  assert.ok(f.some((x) => x.startsWith("M10")));
  assert.ok(!f.some((x) => x.startsWith("#1-")));
  assert.ok(!f.some((x) => x.startsWith("M1.")));
});

test("10-32 narrows to #10 UNF tap drill", () => {
  const rows = search("10-32");
  const taps = rows.filter((r) => r.section === "Tap Drill");
  assert.equal(taps.length, 1);
  assert.equal(taps[0].fastener, "#10-32 UNF");
});

test("6-32 is #6 UNC, not #6 UNF", () => {
  const taps = search("6-32").filter((r) => r.section === "Tap Drill");
  assert.deepEqual(
    taps.map((r) => r.fastener),
    ["#6-32 UNC"],
  );
});

test("1/4-20 returns only the UNC tap drill for 1/4", () => {
  const rows = search("1/4-20");
  const taps = rows.filter((r) => r.section === "Tap Drill");
  assert.deepEqual(
    taps.map((r) => r.fastener),
    ["1/4-20 UNC"],
  );
  assert.ok(has(rows, { section: "Tap Drill", value: 0.201, drill: "#7" }));
});

test("decimal .25 resolves to 1/4", () => {
  const f = fasteners(search(".25"));
  assert.ok(f.every((x) => x.startsWith("1/4")));
  assert.ok(f.length > 0);
});

test("0.375 resolves to 3/8", () => {
  const f = fasteners(search("0.375"));
  assert.ok(f.length > 0 && f.every((x) => x.startsWith("3/8")));
});

test("clearance for #10 returns only clearance rows", () => {
  const rows = search("clearance for #10");
  assert.deepEqual(sections(rows), ["Clearance Hole"]);
  assert.equal(rows.length, 3);
});

test("#10 close returns exactly the close-fit row", () => {
  const rows = search("#10 close");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, "Close Fit");
  assert.equal(rows[0].value, 0.196);
  assert.equal(rows[0].unit, "in");
});

test("m6 close fit returns ISO fine (close) clearance in mm", () => {
  const rows = search("m6 close fit");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].fastener, "M6");
  assert.equal(rows[0].label, "Close Fit (H12)");
  assert.equal(rows[0].value, 6.4);
  assert.equal(rows[0].unit, "mm");
});

test("m6 returns coarse tap drill 5.0 and clearance 6.4/6.6/7.0", () => {
  const rows = search("m6");
  assert.ok(has(rows, { section: "Tap Drill", fastener: "M6x1.0", value: 5 }));
  assert.ok(has(rows, { section: "Clearance Hole", label: "Close Fit (H12)", value: 6.4 }));
  assert.ok(has(rows, { section: "Clearance Hole", label: "Normal Fit (H13)", value: 6.6 }));
  assert.ok(has(rows, { section: "Clearance Hole", label: "Loose Fit (H14)", value: 7 }));
  assert.ok(fasteners(rows).every((f) => f === "M6" || f.startsWith("M6x")));
});

test("m8x1 narrows to the M8 fine-pitch tap drill", () => {
  const taps = search("m8x1").filter((r) => r.section === "Tap Drill");
  assert.deepEqual(
    taps.map((r) => r.fastener),
    ["M8x1.0"],
  );
  assert.equal(taps[0].value, 7);
});

test("m8 fine returns fine pitch tap drills only", () => {
  const taps = search("m8 fine").filter((r) => r.section === "Tap Drill");
  assert.deepEqual(
    taps.map((r) => r.fastener),
    ["M8x1.0"],
  );
});

test("m10 x 1.25 with spaces", () => {
  const taps = search("m10 x 1.25").filter((r) => r.section === "Tap Drill");
  assert.deepEqual(
    taps.map((r) => r.fastener),
    ["M10x1.25"],
  );
});

test("tap 3/8 returns only tap drills for 3/8", () => {
  const rows = search("tap 3/8");
  assert.deepEqual(sections(rows), ["Tap Drill"]);
  assert.ok(has(rows, { fastener: "3/8-16 UNC", value: 0.3125, drill: "5/16" }));
  assert.ok(has(rows, { fastener: "3/8-24 UNF", value: 0.332, drill: "Q" }));
});

test("3/8 tap drill (trailing keyword) works too", () => {
  assert.deepEqual(sections(search("3/8 tap drill")), ["Tap Drill"]);
});

test("cbore 1/4 returns counterbore diameter and depth", () => {
  const rows = search("cbore 1/4");
  assert.deepEqual(sections(rows), ["Counterbore"]);
  assert.ok(has(rows, { label: "Diameter", value: 0.4375 }));
  assert.ok(has(rows, { label: "Depth", value: 0.25 }));
});

test("counterbore m6", () => {
  const rows = search("counterbore m6");
  assert.deepEqual(sections(rows), ["Counterbore"]);
  assert.ok(has(rows, { label: "Diameter", value: 11 }));
});

test("unc 1/4 returns coarse thread only", () => {
  const taps = search("unc 1/4").filter((r) => r.section === "Tap Drill");
  assert.deepEqual(
    taps.map((r) => r.fastener),
    ["1/4-20 UNC"],
  );
});

test("number 10 and no. 10 both resolve to #10", () => {
  assert.ok(fasteners(search("number 10")).every((f) => f.startsWith("#10")));
  assert.ok(fasteners(search("no. 10")).every((f) => f.startsWith("#10")));
});

test("size with no matches returns empty", () => {
  assert.deepEqual(search("#99"), []);
  assert.deepEqual(search("m99"), []);
});

test("empty query returns a non-empty default set", () => {
  assert.ok(search("").length > 0);
});

test("every row carries a converted value in the other unit", () => {
  for (const r of search("#10")) {
    assert.ok(typeof r.altValue === "number");
    assert.equal(r.altUnit, r.unit === "in" ? "mm" : "in");
  }
  const m6 = search("m6 close")[0];
  assert.equal(m6.altValue, 0.252);
});

test("results are ordered: Tap Drill, Clearance Hole, Counterbore, Thread", () => {
  const order = sections(search("1/4"));
  assert.deepEqual(order, ["Tap Drill", "Clearance Hole", "Counterbore", "Thread"]);
});
