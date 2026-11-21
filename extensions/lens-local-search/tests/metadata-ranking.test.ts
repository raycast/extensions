import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryInterpreter, candidateMetadata } from "../src/decision.ts";
import type { SearchResult } from "../src/backend.ts";
const result: SearchResult = { meaning: true, strong: 2, hits: ["phone", "desktop", "weak"].map((name, i) => ({
  path: `/private/secret-folder/${name}.png`, kind: "image", segment: "page", segment_id: i, modified: 100, size: 900,
  score: i === 2 ? 0.2 : 0.95 - i * 0.02, excerpt: "PRIVATE CONTENT", info: { width: i === 0 ? "900" : "1600", height: "1000", ocr: "PRIVATE OCR", path: "PRIVATE PATH" },
})) };
const signal = () => new AbortController().signal;
test("optional metadata ranking failure never disables query interpretation", async (t) => {
  let rankings = 0;
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    if (body.questions.c0) { rankings++; return new Response("PRIVATE", { status: 503 }); }
    const name = body.questions.file_type ? "file_type" : "operation", choice = name === "file_type" ? "image" : "done";
    return new Response(JSON.stringify({ answers: { [name]: { type: "choice", choice, confidence: 1, probabilities: { [choice]: 1 } }, ...(body.questions.filename_scope ? { filename_scope: { type: "choice", choice: "descriptive", confidence: 1, probabilities: { descriptive: 1 } } } : {}) } }));
  });
  const model = new QueryInterpreter({ subqApiKey: "test" });
  assert.equal(await model.rerank("wallpaper", result, signal()), result);
  assert.deepEqual(await model.interpret("picture at the beach", "auto", signal()), { kind: "image" });
  assert.equal(await model.rerank("another wallpaper", result, signal()), result);
  assert.equal(rankings, 1, "only optional ranking is in cooldown");
});
test("candidate request uses only agreed fields; ranking stays bounded, cached and within relevance groups", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    calls++;
    const body = JSON.parse(String(options.body)), state = JSON.parse(body.state);
    assert.equal(state.query, "desktop wallpaper");
    assert.equal(state.candidates[0].filename, "phone.png");
    for (const candidate of state.candidates) assert.ok(body.questions[candidate.id].instructions.includes(`id ${candidate.id},`));
    assert.doesNotMatch(JSON.stringify(body), /secret-folder|PRIVATE|excerpt|segment_id/);
    return new Response(JSON.stringify({ answers: Object.fromEntries(state.candidates.map((c: { id: string }, i: number) => {
      const choice = i === 0 ? "poor" : "excellent";
      return [c.id, { type: "choice", choice, confidence: 0.95, probabilities: { [choice]: 0.95 } }];
    })) }));
  });
  const model = new QueryInterpreter({ subqApiKey: "test" });
  const ranked = await model.rerank("desktop wallpaper", result, signal());
  assert.deepEqual(ranked.hits.map((h) => h.path), [result.hits[1].path, result.hits[0].path, result.hits[2].path]);
  assert.ok(ranked.localScores!.get(result.hits[1])! > ranked.localScores!.get(result.hits[0])!, "metadata guidance must survive into local content fusion");
  await model.rerank("desktop wallpaper", result, signal()); assert.equal(calls, 1);
  assert.equal(candidateMetadata({ ...result, hits: Array(40).fill(result.hits[0]) }).length, 12);
});
test("query-only mode and literal searches never send candidates", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; throw new Error("must not call"); });
  assert.equal(await new QueryInterpreter({ subqApiKey: "test", decisionMetadata: "query" }).rerank("wallpaper", result, signal()), result);
  const strict = { ...result, literal: true };
  assert.equal(await new QueryInterpreter({ subqApiKey: "test" }).rerank("name contains RE", strict, signal()), strict);
  assert.equal(calls, 0);
});
test("model-planned literals come only from the typed request and execute as a composed plan", async (t) => {
  const steps = ["ext_is", "name_contains", "and", "done"]; let step = -1;
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    const answer = (choice: string) => ({ type: "choice", choice, confidence: 0.99, probabilities: { [choice]: 0.99 } });
    if (body.questions.file_type) return new Response(JSON.stringify({ answers: { file_type: answer("documents") } }));
    if (body.questions.operation) return new Response(JSON.stringify({ answers: { operation: answer(steps[++step]), ...(body.questions.filename_scope ? { filename_scope: answer("explicit") } : {}), ...(body.questions.supported ? { supported: answer("yes") } : {}), ...(body.questions.coverage ? { coverage: answer("complete") } : {}) } }));
    if (body.questions.normalized) return new Response(JSON.stringify({ answers: { normalized: answer("pdf") } }));
    const value = Object.keys(body.questions.value.criteria).find((key) => body.questions.value.criteria[key] === (step === 0 ? "PDFs" : "RE"))!;
    return new Response(JSON.stringify({ answers: { value: answer(value) } }));
  });
  const decision = await new QueryInterpreter({ subqApiKey: "test" }).interpret("PDFs whose filename includes RE", "auto", signal());
  assert.deepEqual(decision.plan?.filter, { op: "and", args: [{ op: "ext_is", value: "pdf" }, { op: "name_contains", value: "RE" }] });
});
test("adjacent suitability probabilities guide close native scores without requiring an arbitrary winning category", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ answers: {
    c0: { type: "choice", choice: "poor", confidence: 0.35, probabilities: { poor: 0.5, weak: 0.45, neutral: 0.05, good: 0, excellent: 0 } },
    c1: { type: "choice", choice: "excellent", confidence: 0.45, probabilities: { poor: 0, weak: 0, neutral: 0.05, good: 0.4, excellent: 0.55 } },
  } })));
  const ranked = await new QueryInterpreter({ subqApiKey: "test" }).rerank("desktop wallpaper", result, signal());
  assert.equal(ranked.hits[0], result.hits[1]);
  assert.equal(ranked.hits[2], result.hits[2]);
});
