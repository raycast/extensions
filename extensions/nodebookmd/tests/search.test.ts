// Runs the ranking on the title list of a running NodebookMD, the same list the extension gets.
import assert from "node:assert/strict";
import { test } from "node:test";
import { combine, rankBodies } from "../src/combine";
import { inScope, parseScope } from "../src/scopes";
import type { Hit } from "../src/types";

const BASE_URL = process.env.NODEBOOK_URL ?? "http://127.0.0.1:48800";

async function firstHit(titles: Hit[], query: string): Promise<string> {
  const { scope, words } = parseScope(query);
  const scoped = titles.filter((hit) => inScope(scope, hit.path));
  const response = await fetch(`${BASE_URL}/api/search?query=${encodeURIComponent(words)}&limit=120`);
  const bodies = ((await response.json()) as Hit[]).filter((hit) => inScope(scope, hit.path));
  return combine(scoped, rankBodies(bodies, 6), words, 30)[0]?.path ?? "";
}

test("the first hit is the page the app puts first", async (context) => {
  const titles = (await fetch(`${BASE_URL}/api/titles`).then(
    (response) => response.json(),
    () => null,
  )) as Hit[] | null;
  if (!titles) return context.skip("NodebookMD is not running");
  const expected: Record<string, string> = {
    box: "nodes/sop/box",
    cptp: "nodes/sop/copytopoints",
    rbdmf: "nodes/sop/rbdmaterialfracture",
    atwr: "nodes/sop/attribwrangle",
    "v:point": "vex/functions/point",
    "sop:scatter": "nodes/sop/scatter",
    "box size": "nodes/sop/box",
    "sop:aprn": "nodes/sop/adaptiveprune",
    "hs:oprn": "commands/oprename",
  };
  for (const [query, path] of Object.entries(expected)) {
    assert.equal(await firstHit(titles, query), path, query);
  }
});
