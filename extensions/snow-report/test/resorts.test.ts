import assert from "node:assert/strict";
import { test } from "node:test";
import resorts from "../src/data/resorts.json";
import type { Resort } from "../src/types";

const all = resorts as Resort[];

test("ids are unique and every resort has a name and valid coordinates", () => {
  assert.equal(new Set(all.map((r) => r.id)).size, all.length);
  for (const r of all) {
    assert.ok(r.name.trim(), `${r.id} has no name`);
    assert.ok(Math.abs(r.lat) <= 90 && Math.abs(r.lon) <= 180, `${r.name} has bad coordinates`);
  }
});

test("elevations come in pairs, base at or below top", () => {
  for (const r of all) {
    assert.equal(r.baseElevation === undefined, r.topElevation === undefined, `${r.name} has half an elevation`);
    if (r.baseElevation !== undefined) assert.ok(r.baseElevation <= r.topElevation!, `${r.name} base above top`);
  }
});

test("no indoor slopes", () => {
  const indoor = all.filter((r) => /\bindoor\b|snowworld|xscape|室内/i.test(r.name));
  assert.deepEqual(
    indoor.map((r) => r.name),
    [],
  );
});
