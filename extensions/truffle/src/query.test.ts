import assert from "node:assert/strict";
import { test } from "node:test";
import { clock, merge, plan, scoped, where, type DigupHit, type FsearchHit } from "./query.ts";

test("a name goes to both engines, fsearch first", () => {
  assert.deepEqual(plan("main.rs"), { fsearch: "main.rs", digup: "main.rs", code: false, lead: "fsearch" });
});

test("a description leads with meaning", () => {
  assert.equal(plan("a dog on the beach").lead, "digup");
});

test("fsearch filters and operators keep DigUp out", () => {
  for (const q of [
    "ext:rs grep:apply_dir",
    "readme in:~/Developer",
    "'exact",
    "^prefix",
    "src/**/*.rs",
    "!test/ init",
    "suffix$",
  ]) {
    assert.equal(plan(q).digup, null, q);
    assert.equal(plan(q).fsearch, q, q);
  }
});

test("code: searches DigUp's code index only", () => {
  assert.deepEqual(plan("code: retry with backoff"), {
    fsearch: null,
    digup: "code: retry with backoff",
    code: true,
    lead: "digup",
  });
  assert.equal(plan("code:").digup, null);
});

test("an empty query asks nothing", () => {
  assert.deepEqual(plan("   "), { fsearch: null, digup: null, code: false, lead: "fsearch" });
});

const du = (path: string, extra: Partial<DigupHit> = {}): DigupHit => ({
  path,
  kind: "pdf",
  segment: "page",
  segment_id: 1,
  score: 1,
  modified: 0,
  size: 0,
  info: {},
  ...extra,
});
const fs = (path: string): FsearchHit => ({ path, kind: "file", mtime: 0, size: 0, score: 1 });

test("each file shows once, DigUp's row kept for the moment it knows", () => {
  const out = merge(
    [du("/a.pdf", { loc: 3 }), du("/a.pdf", { loc: 9, segment_id: 2 }), du("/b.mov")],
    [fs("/a.pdf"), fs("/c.txt")],
  );
  assert.deepEqual(
    out.digup.map((h) => [h.path, h.loc]),
    [
      ["/a.pdf", 3],
      ["/b.mov", undefined],
    ],
  );
  assert.deepEqual(
    out.fsearch.map((h) => h.path),
    ["/c.txt"],
  );
});

test("moments read like a player's clock", () => {
  assert.equal(clock(0), "0:00");
  assert.equal(clock(83.9), "1:23");
  assert.equal(clock(3725), "1:02:05");
  assert.equal(where(du("/v.mov", { kind: "video", loc: 83 })), "1:23");
  assert.equal(where(du("/x.pdf", { kind: "pdf", loc: 4 })), "p. 4");
  assert.equal(where(du("/x.ts", { kind: "code", loc: 10, focus: 14 })), "line 14");
  assert.equal(where(du("/i.png", { kind: "image" })), undefined);
});

test("default filters apply unless the query picks its folder", () => {
  assert.equal(scoped("invoice", "in:~ !Library/"), "invoice in:~ !Library/");
  assert.equal(scoped("readme in:~/Code", "in:~ !Library/"), "readme in:~/Code");
  assert.equal(scoped("invoice", "  "), "invoice");
});
