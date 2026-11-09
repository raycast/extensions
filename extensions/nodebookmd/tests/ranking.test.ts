// The ranking on a few page names, so it is checked without the app.
import assert from "node:assert/strict";
import { test } from "node:test";
import { combine } from "../src/combine";
import { match } from "../src/ranking";
import { inScope, parseScope } from "../src/scopes";
import type { Hit } from "../src/types";

const titles: Hit[] = [
  { path: "nodes/sop/copytopoints", title: "Copy to Points 2.0" },
  { path: "nodes/lop/copytopoints", title: "Copy to Points" },
  { path: "nodes/sop/copytopoints-", title: "Copy to Points" },
  { path: "nodes/sop/adaptiveprune", title: "Adaptive Prune" },
  { path: "nodes/sop/box", title: "Box" },
  { path: "nodes/vop/boxes", title: "Boxes" },
  { path: "vex/functions/point", title: "point" },
  { path: "nodes/sop/delete", title: "Delete" },
  { path: "commands/oprename", title: "oprename" },
];
const first = (query: string, from = titles) => match(from, query, 8)[0]?.path;

test("abbreviations find the node", () => {
  assert.equal(first("cptp"), "nodes/sop/copytopoints");
  assert.equal(first("aprn"), "nodes/sop/adaptiveprune");
  assert.equal(first("oprn"), "commands/oprename");
});

test("a name ranks the page with that name", () => {
  assert.equal(first("box"), "nodes/sop/box");
  assert.equal(first("copy to points"), "nodes/sop/copytopoints");
  assert.equal(first("points copy"), "nodes/sop/copytopoints");
});

test("a shorthand keeps the search to one part", () => {
  const { scope, words } = parseScope("v:point");
  assert.equal(words, "point");
  assert.deepEqual(
    titles.filter((hit) => inScope(scope, hit.path)).map((hit) => hit.path),
    ["vex/functions/point"],
  );
  assert.equal(parseScope("zz:box").scope, undefined);
  assert.equal(parseScope("h:box").scope?.history, true);
});

test("a page name plus a word puts that page first", () => {
  const bodies: Hit[] = [{ path: "nodes/sop/box", title: "Box", score: 1 }];
  assert.equal(combine(titles, bodies, "box size", 8)[0]?.path, "nodes/sop/box");
});
