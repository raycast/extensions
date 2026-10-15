import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { configurationFromPreferences as makeConfiguration, resolveSearch, SearchService, validateResults } from "../src/backend.ts";

const fixture = fileURLToPath(new URL("fixtures/service.mjs", import.meta.url));
const assets = fileURLToPath(new URL("../assets", import.meta.url));
const configurationFromPreferences = (prefs: Record<string, unknown> = {}) => makeConfiguration(prefs, assets, "/tmp/digup-test-support");
function fake() {
  return new SearchService({ ...configurationFromPreferences({ roots: ["/a folder"] }), binary: fixture });
}

test("preferences reject malformed or relative scopes instead of searching everything", () => {
  assert.deepEqual(configurationFromPreferences({}).roots, []);
  assert.throws(() => configurationFromPreferences({ roots: "all" }), /invalid/);
  assert.throws(() => configurationFromPreferences({ roots: ["relative"] }), /invalid/);
  assert.throws(() => configurationFromPreferences({ excludedTypes: [1] }), /Invalid/);
});

test("result validation rejects invalid paths and match counts", () => {
  const hit = { path: '/files/a "$file" 日本語.md', kind: "doc", segment: "chunk", segment_id: 1, modified: 1, size: 2, info: {} };
  assert.equal(validateResults({ hits: [hit], strong: 1, meaning: true }).hits[0].path, hit.path);
  assert.throws(() => validateResults({ hits: [{ ...hit, path: "relative" }], strong: 1, meaning: true }), /invalid/);
  assert.throws(() => validateResults({ hits: [hit], strong: 2, meaning: true }), /Unexpected/);
  for (const field of ["score", "z", "keyword_rank"]) {
    assert.throws(() => validateResults({ hits: [{ ...hit, [field]: "1" }], strong: 1, meaning: true }), /invalid/);
    assert.throws(() => validateResults({ hits: [{ ...hit, [field]: Infinity }], strong: 1, meaning: true }), /invalid/);
  }
});

test("out-of-order responses reach the correct request", async (t) => {
  const service = fake(); t.after(() => service.close());
  const slow = service.request({ op: "echo", value: "slow", delay: 40 });
  const fast = service.request({ op: "echo", value: "fast" });
  assert.equal((await fast).value, "fast");
  assert.equal((await slow).value, "slow");
});

test("backend errors reject their request and preserve a working service", async (t) => {
  const service = fake(); t.after(() => service.close());
  await assert.rejects(service.request({ op: "error" }), /Test backend error/);
  assert.equal((await service.request({ op: "echo" })).ok, true);
});

test("invalid protocol and unexpected exits fail pending work", async () => {
  for (const op of ["invalid", "exit"]) {
    const service = fake();
    await assert.rejects(service.request({ op }), /Invalid response|stopped/);
    service.close();
  }
});

test("timeout stops an unresponsive child and rejects future work", async () => {
  const service = fake();
  await assert.rejects(service.request({ op: "hang" }, 150), /too long/);
  await assert.rejects(service.request({ op: "echo" }), /too long/);
  service.close();
});

test("closing rejects pending requests", async () => {
  const service = fake();
  const pending = service.request({ op: "hang" });
  service.close();
  await assert.rejects(pending, /closed/);
});

test("missing binary is a recoverable failure", async () => {
  const service = new SearchService({ ...configurationFromPreferences({}), binary: "/does-not-exist/digup" });
  await assert.rejects(service.request({ op: "status" }), /ENOENT/);
  service.close();
});

test("unconfigured file or code scopes return no results", async (t) => {
  const service = new SearchService({ ...configurationFromPreferences({}), binary: fixture });
  t.after(() => service.close());
  assert.deepEqual((await service.search("anything", "all")).hits, []);
  assert.deepEqual((await service.search("code: anything", "code")).hits, []);
});

test("automatic image intent is explicit and manual filters take precedence", () => {
  for (const query of ["image of a sweater", "Find me a photo of a sweater", "show pictures with a sweater", "photos showing a sweater"]) {
    assert.deepEqual(resolveSearch(query, "auto"), { text: "a sweater", kind: "image" });
  }
  assert.deepEqual(resolveSearch("screenshot of checkout", "auto"), { text: "checkout", kind: "screenshot" });
  for (const query of ["image compression notes", "how to resize images", "notes about a photo of a sweater", "sweater"]) {
    assert.deepEqual(resolveSearch(query, "auto"), { text: query, kind: "all" });
  }
  for (const kind of ["all", "documents", "video"]) {
    assert.deepEqual(resolveSearch("image of a sweater", kind), { text: "image of a sweater", kind });
  }
  assert.deepEqual(resolveSearch(" code: image of a sweater ", "auto"), { text: "image of a sweater", kind: "code" });
});

test("image scope reaches the engine before ranking; all-files override stays broad", async (t) => {
  const service = fake(); t.after(() => service.close());
  await service.search("image of a sweater", "auto");
  let request = (await service.request({ op: "last-search" })).request as Record<string, unknown>;
  assert.equal(request.q, "a sweater");
  assert.deepEqual(request.kinds, ["image", "screenshot"]);
  await service.search("image of a sweater", "all");
  request = (await service.request({ op: "last-search" })).request as Record<string, unknown>;
  assert.equal(request.q, "image of a sweater");
  assert.equal(request.kinds, undefined);
  await service.search("sweater", "image");
  assert.deepEqual(((await service.request({ op: "last-search" })).request as Record<string, unknown>).kinds, ["image", "screenshot"]);
});

test("image intent tolerates one typo without rewriting the description or overriding filters", async (t) => {
  for (const word of ["iamge", "imge", "immage", "inage", "imgae", "phoot", "pcture", "picutres", "IMAGE"]) {
    assert.deepEqual(resolveSearch(`${word} of a sweater`, "auto"), { text: "a sweater", kind: "image" });
  }
  assert.deepEqual(resolveSearch("screeshot of checkout", "auto"), { text: "checkout", kind: "screenshot" });
  assert.deepEqual(resolveSearch("iamge of sweatter.jpg", "auto"), { text: "sweatter.jpg", kind: "image" });
  for (const query of ["imagination of a sweater", "page of a sweater", "stage of a project", "shape of a sweater", "imge compression notes"]) {
    assert.deepEqual(resolveSearch(query, "auto"), { text: query, kind: "all" });
  }
  assert.deepEqual(resolveSearch("iamge of a sweater", "all"), { text: "iamge of a sweater", kind: "all" });
  const service = fake(); t.after(() => service.close());
  await service.search("iamge of a sweater", "auto");
  const request = (await service.request({ op: "last-search" })).request as Record<string, unknown>;
  assert.equal(request.q, "a sweater");
  assert.deepEqual(request.kinds, ["image", "screenshot"]);
});

test("real DigUp searches meaning, filters kinds and previews text", { skip: !process.env.DIGUP_TEST_INDEX }, async (t) => {
  const index = process.env.DIGUP_TEST_INDEX!;
  const config = { ...configurationFromPreferences({}), index, models: process.env.DIGUP_TEST_MODELS!,
    binary: join(assets, "digup"), roots: [join(dirname(index), "fixtures")] };
  const service = new SearchService(config); t.after(() => service.close());
  const result = await service.search("soft translucent material", "documents");
  assert.equal(result.meaning, true);
  assert.ok(result.hits.length > 0);
  assert.ok(result.hits.every((hit) => hit.kind === "doc" || hit.kind === "pdf"));
  const hit = result.hits.find((hit) => hit.path.endsWith("Glass material.md"));
  assert.ok(hit, "semantic search finds the glass description");
  const text = await service.request({ op: "text", segment: hit.segment_id, path: hit.path, modified: hit.modified, size: hit.size, segment_kind: hit.segment, loc: hit.loc ?? null, code: false });
  assert.match(String(text.text), /refraction/);
  assert.deepEqual((await service.search("glass", "video")).hits, []);
  const status = await service.request({ op: "status" });
  assert.equal(status.encoder, "ready");
  assert.ok(Number(status.vectors) > 0);
});

test("compiled metadata plans run locally before any embedding work", async (t) => {
  const service = fake(); t.after(() => service.close());
  const filter = { op: "and", args: [{ op: "name_prefix", value: "RE" }, { op: "name_contains", value: "2" }] };
  const result = await service.search("any natural phrasing", "auto", { filter, semantic: "", complete: true, uncertain: false });
  const request = (await service.request({ op: "last-search" })).request as Record<string, unknown>;
  assert.equal(request.op, "files"); assert.deepEqual(request.filter, filter);
  assert.equal((await service.request({ op: "prewarm-count" })).prewarms, 0);
  assert.equal(result.literal, true); assert.deepEqual(result.hits, []);
  assert.match(result.queryDescription!, /starts with “RE”.*contains “2”/);
});
test("semantic retrieval receives the plan's subject and hard predicate before its candidate limit", async (t) => {
  const service = fake(); t.after(() => service.close());
  const filter = { op: "ext_is", value: "pdf" };
  await service.search("PDFs describing blue waves", "auto", { filter, semantic: "blue waves", complete: true, uncertain: false });
  const request = (await service.request({ op: "last-search" })).request as Record<string, unknown>;
  assert.equal(request.op, "search"); assert.equal(request.q, "blue waves"); assert.deepEqual(request.filter, filter);
});

test("cancelling one request releases its timeout without killing the shared search process", async (t) => {
  const service = fake(); t.after(() => service.close());
  const controller = new AbortController();
  const pending = service.request({ op: "echo", value: "obsolete", delay: 80 }, 30, controller.signal);
  controller.abort();
  await assert.rejects(pending, /abort/i);
  await new Promise((resolve) => setTimeout(resolve, 110));
  assert.equal((await service.request({ op: "echo", value: "current" })).value, "current");
  const preAborted = new AbortController(); preAborted.abort();
  await assert.rejects(service.search("obsolete", "all", undefined, true, preAborted.signal), /abort/i);
});

test("metadata pages remain bounded and continue past locally excluded or wrong-kind matches", async (t) => {
 const service=fake();t.after(()=>service.close());await service.request({op:'test-pages',wrongKindFirst:true});
 const result=await service.search('files without PDFs','documents',{filter:{op:'not',args:[{op:'ext_is',value:'pdf'}]},semantic:'',complete:true,uncertain:false});
 assert.equal(result.hits.length,1);assert.equal(result.hits[0].path,'/a folder/200.txt');
 const request=(await service.request({op:'last-search'})).request as Record<string,unknown>;
 assert.equal(request.limit,200);assert.deepEqual(request.kinds,['pdf','doc']);
 assert.deepEqual(request.after,{path:'/a folder/199.txt',modified:801});
 assert.equal((await service.request({op:'prewarm-count'})).prewarms,0);
});

test("an engine that repeats a metadata page fails safely instead of looping",async(t)=>{
 const service=fake();t.after(()=>service.close());await service.request({op:'test-pages',wrongKindFirst:true,repeat:true});
 await assert.rejects(service.search('files without PDFs','documents',{filter:{op:'not',args:[{op:'ext_is',value:'pdf'}]},semantic:'',complete:true,uncertain:false}),/engine needs an update/);
});

test("duplicate native rows cannot create duplicate React item identities",()=>{
 const hit={path:'/files/a.txt',kind:'doc',segment:'chunk',segment_id:1,modified:1,size:1,info:{},score:2};
 const result=validateResults({hits:[hit,{...hit,score:1}],strong:1,meaning:true});
 assert.deepEqual(result.hits,[hit]);assert.equal(result.strong,1);
});

test('document passage references are bounded and validated at the engine boundary',()=>{
 const hit={path:'/a.pdf',kind:'pdf',segment:'page',segment_id:1,modified:1,size:2,info:{}};
 const reply=(passages:unknown)=>({hits:[{...hit,passages}],strong:1,meaning:true});
 assert.equal(validateResults(reply([{segment:'page',segment_id:2,loc:9,excerpt:'actual words'}])).hits[0].passages?.[0].loc,9);
 for(const passages of [null,{},[{segment:'name',segment_id:2}],[{segment:'page',segment_id:'2'}],[{segment:'page',segment_id:2,loc:NaN}],Array(3).fill({segment:'page',segment_id:2})])
  assert.throws(()=>validateResults(reply(passages)),/invalid/);
});

test('settled meaning search does not turn exam into example; typing previews keep prefix completion',async(t)=>{
 const service=fake();t.after(()=>service.close());
 await service.search('kth exam','documents',undefined,false);
 assert.equal(((await service.request({op:'last-search'})).request as Record<string,unknown>).prefix_last,true);
 await service.search('kth exam','documents');
 assert.equal(((await service.request({op:'last-search'})).request as Record<string,unknown>).prefix_last,false);
});

test('All Files preserves reciprocal-rank evidence through later scoring instead of comparing raw scores across indexes',async(t)=>{
 const {rankCandidates}=await import('../src/ranking.ts');
 const service=new SearchService({...configurationFromPreferences({roots:['/files'],codeRoots:['/code']}),binary:fixture});t.after(()=>service.close());
 const base={kind:'doc',segment:'chunk',segment_id:1,modified:1,size:1,info:{}};
 const target={...base,path:'/files/exam.pdf',kind:'pdf',score:1},video={...base,path:'/files/unrelated.mp4',kind:'video',score:99999},code={...base,path:'/code/something.ts',kind:'code',score:100};
 service.request=async(r)=>r.op==='search'?{hits:r.code?[code]:[target,video],strong:r.code?1:2,meaning:true}:{};
 const result=await service.search('topic','all');
 assert.equal(result.hits[0].path,target.path);assert.ok(result.localScores!.get(result.hits[0])!>result.localScores!.get(video)!);
 assert.equal(rankCandidates(result,{c0:.1}).hits[0].path,target.path,'a later stage cannot undo rank fusion with incompatible raw scales');
});

test("cancelled and timed-out previews do not stop search requests", async (t) => {
  const service = fake(); t.after(() => service.close());
  const controller = new AbortController();
  const preview = service.request({ op: "render", delay: 150 }, 1000, controller.signal);
  controller.abort(new Error("preview moved"));
  await assert.rejects(preview, /preview moved/);
  await assert.rejects(service.request({ op: "render", delay: 150 }, 40), /too long/);
  assert.equal((await service.request({ op: "echo" })).ok, true);
  const targets = (await service.request({ op: "cancelled-renders" })).targets;
  assert.equal((targets as number[]).length, 2);
});
