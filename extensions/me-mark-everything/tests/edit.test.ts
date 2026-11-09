import assert from "node:assert/strict";
import test from "node:test";
import type { Entity, Session } from "../src/helper";
import { editBaseline, prepareEdit, singleUrl, tagChoices } from "../src/helpers/edit";
import type { FormValues } from "../src/types";
const session = { libraryId: "L" } as Session;
const entity = (): Entity => ({
  id: "b",
  kind: "bookmark",
  values: {
    life: "active",
    title: "Old",
    url: "https://example.org/a",
    note: " note\n",
    position: { parent: "c", order: 7 },
    "tag:t1": true,
    "tag:t2": true,
  },
  heads: {
    life: ["l"],
    title: ["t"],
    url: ["u"],
    note: ["n"],
    position: ["p"],
    "tag:t1": ["g1"],
    "tag:t2": ["g2"],
  },
  conflicts: {},
  policies: { title: "auto" },
  structural: [],
  purged: false,
});
const tag = (id: string, redirect?: string): Entity => ({
  ...entity(),
  id,
  kind: "tag",
  values: { life: "active", name: id, ...(redirect ? { redirect } : {}) },
});
const input = (e: Entity, overrides: Partial<FormValues> = {}): FormValues => ({
  ...editBaseline(e),
  tags: ["t1", "t2"],
  ...overrides,
});
const prepare = (e: Entity, changes: Partial<FormValues>) =>
  prepareEdit(e, editBaseline(e), input(e, changes), "cmd", session, {
    tags: tagChoices([tag("t1"), tag("t2"), tag("t3")], editBaseline(e).tags),
    collections: ["c"],
  });

test("unchanged form sends no command; whitespace and empty title are literal", () => {
  const e = entity();
  assert.equal(prepare(e, {}), null);
  assert.deepEqual(prepare(e, { title: "", note: "\n  " })!.command.edits[0].values, {
    title: "",
    note: "\n  ",
    life: "active",
  });
});
test("dirty fields use original full heads, missing fields [] and explicit life", () => {
  const e = entity();
  const p = prepare(e, { description: "description", favorite: true })!;
  assert.deepEqual(p.command.edits[0].values, { description: "description", favorite: true, life: "active" });
  assert.deepEqual(p.command.edits[0].base, { ...e.heads, description: [], favorite: [] });
  p.command.edits[0].base!.title.push("other");
  assert.deepEqual(e.heads.title, ["t"]);
  assert.equal(p.command.edits[0].entity, e.id);
  assert.equal(p.command.edits[0].resolve, undefined);
});
test("collection move preserves original order and tags carry their own base", () => {
  const p = prepare(entity(), { collection: "-1", tags: ["t2", "t3"] })!.command.edits[0];
  assert.deepEqual(p.values, {
    position: { parent: null, order: 7 },
    "tag:t3": true,
    "tag:t1": false,
    life: "active",
  });
  assert.deepEqual(p.base!["tag:t3"], []);
  assert.deepEqual(p.base!["tag:t1"], ["g1"]);
});
test("one URL preserves comma semicolon Unicode and does not touch metadata", () => {
  const url = "https://example.org/中文/a,b;c?q=hello world";
  assert.equal(singleUrl(url), url);
  assert.deepEqual(prepare(entity(), { link: url })!.command.edits[0].values, { url, life: "active" });
  for (const url of [
    "https://",
    "HTTPS://example.org",
    "ftp://example.org",
    "https://example.org/a\nb",
    "a.com",
  ])
    assert.throws(() => singleUrl(url), { code: "INVALID" });
});
test("malformed existing field values and missing order cannot be guessed", () => {
  for (const patch of [
    { title: 1 },
    { note: false },
    { favorite: "yes" },
    { description: null },
    { position: { parent: null } },
    { "tag:t1": "yes" },
  ]) {
    const e = entity();
    Object.assign(e.values, patch);
    assert.throws(() => editBaseline(e), { code: "INVALID" });
  }
});
test("ordinary edits reject wrong kind, trash, purged, conflict and structure", () => {
  for (const modify of [
    (e: Entity) => (e.kind = "tag"),
    (e: Entity) => (e.values.life = "trashed"),
    (e: Entity) => (e.purged = true),
    (e: Entity) => (e.conflicts.title = []),
    (e: Entity) => e.structural.push({ field: "position", reason: "deleted-parent" }),
  ]) {
    const e = entity();
    modify(e);
    assert.throws(() => editBaseline(e));
  }
  const e = entity();
  delete e.heads.life;
  assert.throws(() => editBaseline(e), { code: "BASE_REQUIRED" });
});
test("option loading failure leaves collection and all memberships unchanged", () => {
  const e = entity();
  const p = prepareEdit(
    e,
    editBaseline(e),
    input(e, { title: "new", tags: [], collection: "-1" }),
    "cmd",
    session,
    {},
  )!;
  assert.deepEqual(p.command.edits[0].values, { title: "new", life: "active" });
});
test("redirect display deduplicates aliases; removing display removes every original member", () => {
  const e = entity(),
    tags = [tag("t1", "t2"), tag("t2"), tag("t3")];
  const choices = tagChoices(tags, ["t1", "t2"]);
  assert.deepEqual(choices.selected, ["t2"]);
  assert.equal(
    prepareEdit(e, editBaseline(e), input(e, { tags: ["t2"] }), "cmd", session, { tags: choices }),
    null,
  );
  const p = prepareEdit(e, editBaseline(e), input(e, { tags: ["t3"] }), "cmd", session, { tags: choices })!;
  assert.deepEqual(p.command.edits[0].values, {
    "tag:t3": true,
    "tag:t1": false,
    "tag:t2": false,
    life: "active",
  });
});
test("same-name tags stay distinct; invalid member redirects block editing", () => {
  const tags = [tag("t1"), tag("t2")];
  tags.forEach((t) => (t.values.name = "Same"));
  assert.notEqual(tagChoices(tags, []).items[0].name, tagChoices(tags, []).items[1].name);
  for (const tags of [
    [tag("t1", "missing")],
    [tag("t1", "t2"), tag("t2", "t1")],
    [{ ...tag("t1"), conflicts: { name: [] } }],
  ])
    assert.throws(() => tagChoices(tags, ["t1"]));
});
