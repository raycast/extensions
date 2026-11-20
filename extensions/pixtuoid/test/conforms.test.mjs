import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { conforms, rowsOf } from "../src/conforms.ts";

const schema = (name) => JSON.parse(readFileSync(new URL(`../contract/${name}.schema.json`, import.meta.url), "utf8"));
const sourceStatus = schema("source-status");
const outcomeRow = schema("outcome-row");

test("a source row conforms, its optional health null or absent", () => {
  const row = { id: "codex", display_name: "Codex", connected: true, cli_present: false };
  assert.ok(conforms(row, sourceStatus));
  assert.ok(conforms({ ...row, health: null }, sourceStatus));
  assert.ok(conforms({ ...row, health: "decode drift" }, sourceStatus));
});

test("a source row missing a field or mistyped does not conform", () => {
  const row = { id: "codex", display_name: "Codex", connected: true, cli_present: false };
  const missing = { ...row };
  delete missing.display_name;
  assert.ok(!conforms(missing, sourceStatus));
  assert.ok(!conforms({ ...row, connected: "yes" }, sourceStatus));
  assert.ok(!conforms({ ...row, health: 3 }, sourceStatus));
  assert.ok(!conforms(null, sourceStatus));
  assert.ok(!conforms([row], sourceStatus));
});

test("a field a newer CLI adds is ignored, though the schema forbids it", () => {
  assert.equal(sourceStatus.additionalProperties, false);
  const row = { id: "codex", display_name: "Codex", connected: true, cli_present: false };
  assert.ok(conforms({ ...row, since: "0.20.0" }, sourceStatus));
});

test("an outcome row's token is one the schema's enum names", () => {
  assert.ok(conforms({ id: "codex", outcome: "failed", message: "denied" }, outcomeRow));
  assert.ok(conforms({ id: "codex", outcome: "connected" }, outcomeRow));
  assert.ok(!conforms({ id: "codex", outcome: "exploded" }, outcomeRow));
  assert.ok(!conforms({ id: "codex" }, outcomeRow));
});

test("rowsOf returns conforming rows and throws the skew error on anything else", () => {
  const source = { id: "codex", display_name: "Codex", connected: true, cli_present: false };
  assert.deepEqual(rowsOf(JSON.stringify([source]), sourceStatus, "sources --json"), [source]);
  assert.deepEqual(rowsOf("[]", outcomeRow, "connect --json"), []);
  const skew = /pixtuoid sources --json printed rows this extension can't read/;
  assert.throws(() => rowsOf("{}", sourceStatus, "sources --json"), skew);
  assert.throws(() => rowsOf(JSON.stringify([source, { id: 1 }]), sourceStatus, "sources --json"), skew);
  assert.throws(() => rowsOf(JSON.stringify([{ id: "codex", outcome: "partial" }]), outcomeRow, "sources --json"), skew);
});
