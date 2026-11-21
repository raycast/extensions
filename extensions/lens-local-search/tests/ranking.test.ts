import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Hit, SearchResult } from "../src/backend.ts";
import { rankResults } from "../src/ranking.ts";

function hit(name: string, score: number, width?: string, height?: string, extra: Partial<Hit> = {}): Hit {
  return { path: `/files/${name}`, kind: "image", segment: "image", segment_id: 1, size: 100, modified: 1,
    score, info: { ...(width ? { width } : {}), ...(height ? { height } : {}) }, ...extra };
}
function results(hits: Hit[], strong = hits.length): SearchResult { return { hits, strong, meaning: true }; }

test("desktop suitability softly promotes usable wide images without excluding portrait candidates", () => {
  const tall = hit("tall.png", 5, "2765", "6144");
  const wide = hit("wide.png", 4.9, "3840", "2400");
  const tiny = hit("tiny.png", 4.9, "320", "200");
  const unrelated = hit("unrelated.png", 1, "7680", "4800");
  const original = results([tall, tiny, wide, unrelated]);
  const ranked = rankResults(original, { shape: "landscape", detail: "large" });
  assert.deepEqual(ranked.hits, [wide, tiny, tall, unrelated]);
  assert.equal(ranked.hits.length, original.hits.length);
  assert.equal(original.hits[0], tall, "original local response is not mutated");
});

test("phone and square preferences are continuous, and unknown dimensions stay searchable", () => {
  const wide = hit("wide", 5, "1600", "1000");
  const tall = hit("tall", 5, "1000", "1600");
  const square = hit("square", 5, "1000", "1000");
  const unknown = hit("unknown", 5);
  const malformed = hit("malformed", 5, "Infinity", "0");
  const original = results([wide, unknown, malformed, square, tall]);
  assert.equal(rankResults(original, { shape: "portrait" }).hits[0], tall);
  assert.equal(rankResults(original, { shape: "square" }).hits[0], square);
  assert.equal(rankResults(original, { detail: "large" }).hits.length, 5);
  assert.equal(rankResults(original, {}), original, "ordinary searches retain the native order exactly");
});

test("soft boosts respect relevance groups, non-image files and missing or zero scores", () => {
  const tall = hit("strong", 5, "1000", "1600");
  const weak = hit("weak", 4.9, "3840", "2400");
  const doc = hit("doc", 5, "3840", "2400", { kind: "doc" });
  assert.deepEqual(rankResults(results([tall, weak], 1), { shape: "landscape" }).hits, [tall, weak]);
  assert.equal(rankResults(results([doc, tall]), { shape: "landscape" }).hits[0], tall);
  assert.equal(rankResults(results([]), { order: "newest" }).strong, 0);
  const zero = results([hit("a", 0), hit("b", 0)]);
  assert.deepEqual(rankResults(zero, { detail: "large" }).hits, zero.hits);
});

test("query preferences nudge recency, literal matches and meaning without discarding relevance", () => {
  const older = hit("older", 5, undefined, undefined, { modified: 10, z: 4, keyword_rank: 1 });
  const newer = hit("newer", 4.9, undefined, undefined, { modified: 100, z: 6 });
  const weak = hit("weak", 1, undefined, undefined, { modified: 200, keyword_rank: 2, z: 1 });
  const original = results([older, newer, weak]);
  assert.equal(rankResults(original, { order: "newest" }).hits[0], newer);
  assert.equal(rankResults(original, { order: "oldest" }).hits[0], older);
  assert.equal(rankResults(results([newer, older, weak]), { order: "exact" }).hits[0], older);
  assert.equal(rankResults(original, { order: "meaning" }).hits[0], newer);
  assert.equal(rankResults(original, { order: "newest" }).hits.at(-1), weak);
});

test("replaying actual wallpaper candidates promotes screen fit while preserving all 40 files", () => {
  const original = JSON.parse(readFileSync(new URL("fixtures/wallpaper-ranking.json", import.meta.url), "utf8")) as SearchResult;
  const ranked = rankResults(original, { shape: "landscape", detail: "large" });
  assert.equal(original.hits[0].path, "/fixture/image-0.png");
  assert.equal(ranked.hits[0].path, "/fixture/image-1.png", "4800×3000 image replaces the 2765×6144 image at the top");
  assert.equal(ranked.hits.length, 40);
  const portraits = (hits: Hit[]) => hits.slice(0, 6).filter((hit) => Number(hit.info.height) > Number(hit.info.width)).length;
  assert.equal(portraits(original.hits), 4);
  assert.equal(portraits(ranked.hits), 1);
  assert.deepEqual(new Set(ranked.hits.map((hit) => hit.path)), new Set(original.hits.map((hit) => hit.path)));
});

test("candidate adjustments retain the locally computed suitability baseline", async () => {
  const { rankCandidates } = await import("../src/ranking.ts");
  const hits = [
    { path: "/portrait.png", kind: "image", score: 1, info: { width: "1000", height: "2000" } },
    { path: "/desktop.png", kind: "image", score: 0.99, info: { width: "3200", height: "2000" } },
  ].map((hit, i) => ({ ...hit, segment: "image", segment_id: i, size: 10, modified: 100 }));
  const local = rankResults({ hits, strong: 2, meaning: true }, { shape: "landscape" });
  assert.equal(local.hits[0].path, "/desktop.png");
  const guided = rankCandidates(local, { c0: 0.1, c1: 0.1 });
  assert.equal(guided.hits[0].path, "/desktop.png");
});

test('uncertain medium evidence survives later ranking as a soft prior without hiding other file types',async()=>{
 const {rankCandidates}=await import('../src/ranking.ts'),{fuseRelevance}=await import('../src/local-reranker.ts');
 const video=hit('clip.mp4',1,undefined,undefined,{kind:'video'}),pdf=hit('assessment.pdf',.98,undefined,undefined,{kind:'pdf'});
 const original=results([video,pdf]);
 const ranked=rankResults(original,{medium:{documents:.324,video:.005}});
 assert.equal(ranked.hits[0],pdf);assert.equal(ranked.hits.length,2);
 const guided=rankCandidates(ranked,{c0:.1,c1:.1});
 assert.equal(fuseRelevance(guided,[video,pdf],{r0:.60,r1:.42})[0].hit,pdf);
 assert.equal(fuseRelevance(guided,[video,pdf],{r0:.99,r1:.10})[0].hit,video,'strong content evidence can outweigh a soft medium preference');
});
