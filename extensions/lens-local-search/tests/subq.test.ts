import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test, type TestContext } from "node:test";
import { QueryInterpreter } from "../src/decision.ts";

const signal = () => new AbortController().signal;
function decision(choice = "image", confidence = 0.95, probability = 0.95) {
  return new Response(JSON.stringify({ answers: { file_type: { type: "choice", choice, confidence, probabilities: { [choice]: probability } } } }));
}

test("SubQ sends only the typed query and fixed routing instructions to the fixed endpoint", async (t) => {
  const requests: { url: string; options: RequestInit }[] = [];
  mockFetch(t, async (url: string, options: RequestInit) => { requests.push({ url, options }); return decision(); });
  const interpreter = new QueryInterpreter({ subqApiKey: "test-key" });
  assert.deepEqual(await interpreter.interpret("the picture where I wore that sweater", "auto", signal()), { kind: "image" });
  const { url, options } = requests[0];
  assert.equal(url, "https://api.subq.ai/v1/systemone");
  assert.equal(options.redirect, "error");
  const body = JSON.parse(String(options.body));
  assert.deepEqual(Object.keys(body).sort(), ["model", "questions", "state"]);
  assert.equal(body.state, "the picture where I wore that sweater");
  assert.equal(body.model, "subq-snap-preview");
  assert.deepEqual(Object.keys(body.questions.file_type.criteria).sort(), ["all", "audio", "code", "documents", "image", "screenshot", "video"]);
  assert.equal((options.headers as Record<string, string>).Authorization, "Bearer test-key");
  await interpreter.interpret(body.state, "auto", signal());
  assert.equal(requests.length, 1, "repeat queries use the session cache");
});

test("no key, empty or oversized query and abort never call SubQ", async (t) => {
  let calls = 0;
  mockFetch(t, async () => { calls++; return decision(); });
  assert.deepEqual(await new QueryInterpreter({}).interpret("a picture at the beach", "auto", signal()), {});
  const interpreter = new QueryInterpreter({ subqApiKey: "test-key" });
  for (const query of ["", "hi", "x".repeat(513)]) {
    assert.deepEqual(await interpreter.interpret(query, "auto", signal()), {});
  }
  const controller = new AbortController(); controller.abort();
  assert.deepEqual(await interpreter.interpret("the picture at the beach", "auto", controller.signal), {});
  assert.equal(calls, 0);
});

test("low confidence, low winning probability and ambiguous intent preserve broad local search", async (t) => {
  let response = decision("image", 0.6);
  mockFetch(t, async () => response);
  const interpreter = new QueryInterpreter({ subqApiKey: "test-key" });
  assert.deepEqual(await interpreter.interpret("an ambiguous topic", "auto", signal()), {});
  response = decision("image", 0.95, 0.6);
  assert.deepEqual(await interpreter.interpret("another ambiguous topic", "auto", signal()), {});
  response = decision("all");
  assert.deepEqual(await interpreter.interpret("a broad topic", "auto", signal()), {});
});

test("untrusted choices and malformed decisions cannot select a scope or execute a path", async (t) => {
  for (const answer of [
    { type: "choice", choice: "/private/secret", confidence: 1, probabilities: { "/private/secret": 1 } },
    { type: "choice", choice: "image", confidence: "1", probabilities: { image: 1 } },
    { type: "choice", choice: "image", confidence: 1.1, probabilities: { image: 1 } },
    { type: "choice", choice: "image", confidence: 1, probabilities: { image: "1" } },
    { type: "choice", choice: "image", confidence: 1 },
  ]) {
    mockFetch(t, async () => new Response(JSON.stringify({ answers: { file_type: answer } })));
    const result = await new QueryInterpreter({ subqApiKey: "test-key" }).interpret("the picture at the beach", "auto", signal());
    assert.equal(result.kind, undefined);
    assert.match(result.notice!, /invalid decision/);
    t.mock.restoreAll();
  }
});

test("API errors back off and never surface provider bodies, queries or credentials", async (t) => {
  for (const status of [401, 402, 403, 429, 500]) {
    let calls = 0;
    mockFetch(t, async () => { calls++; return new Response("PRIVATE BODY test-key", { status }); });
    const interpreter = new QueryInterpreter({ subqApiKey: "test-key" });
    const result = await interpreter.interpret("private typed query", "auto", signal());
    assert.equal(result.kind, undefined);
    assert.match(result.notice!, /Using local search/);
    assert.doesNotMatch(result.notice!, /PRIVATE|test-key|private typed query/);
    await interpreter.interpret("another query", "auto", signal());
    assert.equal(calls, 1);
    t.mock.restoreAll();
  }
  mockFetch(t, async () => { throw new Error("SubQ echoed test-key and private typed query"); });
  const result = await new QueryInterpreter({ subqApiKey: "test-key" }).interpret("private typed query", "auto", signal());
  assert.equal(result.notice, "SubQ connection failed · Using local search");
});

test("cancelled responses are discarded and do not poison the next query", async (t) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  mockFetch(t, async () => { await gate; return decision(); });
  const interpreter = new QueryInterpreter({ subqApiKey: "test-key" });
  const controller = new AbortController();
  const pending = interpreter.interpret("the picture at the beach", "auto", controller.signal);
  controller.abort(); release();
  assert.deepEqual(await pending, {});
  assert.deepEqual(await interpreter.interpret("the picture in the park", "auto", signal()), { kind: "image" });
});

test("network timeouts stay bounded and fall back locally", async (t) => {
  mockFetch(t, async (_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal!.addEventListener("abort", () => reject(new Error("Timeout")), { once: true });
  }));
  const keepAlive = setTimeout(() => {}, 3500); t.after(() => clearTimeout(keepAlive));
  const started = Date.now();
  const result = await new QueryInterpreter({ subqApiKey: "test-key" }).interpret("the picture at the beach", "auto", signal());
  assert.equal(result.kind, undefined);
  assert.equal(result.notice, "SubQ timed out · Using local search");
  assert.ok(Date.now() - started < 3300);
});

test("HTTP failures have specific safe messages and transient connections recover after five seconds", async (t) => {
  for (const [status, message] of [[429, "rate limited"], [503, "service error (HTTP 503)"], [422, "rejected this request (HTTP 422)"]] as const) {
    mockFetch(t, async () => new Response("PRIVATE BODY test-key", { status }));
    const result = await new QueryInterpreter({ subqApiKey: "test-key" }).interpret("private query", "auto", signal());
    assert.ok(result.notice?.includes(message));
    assert.doesNotMatch(result.notice!, /PRIVATE|test-key|private query/);
    t.mock.restoreAll();
  }
  let now = 1000, calls = 0;
  t.mock.method(Date, "now", () => now);
  mockFetch(t, async () => { if (++calls === 1) throw new Error("private transport details"); return decision(); });
  const model = new QueryInterpreter({ subqApiKey: "test-key" });
  await model.interpret("picture at the beach", "auto", signal());
  await model.interpret("picture at the park", "auto", signal());
  assert.equal(calls, 1);
  now += 5001;
  assert.deepEqual(await model.interpret("picture at the park", "auto", signal()), { kind: "image" });
  assert.equal(calls, 2);
});

test("incomplete planning is not cached as a permanent failure for the query", async (t) => {
  let fail = true;
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    if (body.questions.file_type) return decision();
    if (fail) return new Response("", { status: 503 });
    return new Response(JSON.stringify({ answers: { operation: { type: "choice", choice: "done", confidence: 1, probabilities: { done: 1 } }, filename_scope: { type: "choice", choice: "descriptive", confidence: 1, probabilities: { descriptive: 1 } } } }));
  });
  const model = new QueryInterpreter({ subqApiKey: "test-key" });
  assert.match((await model.interpret("picture at the beach", "auto", signal())).notice!, /service error/);
  fail = false;
  assert.deepEqual(await model.interpret("picture at the beach", "auto", signal()), { kind: "image" });
});

test("the in-memory query cache is bounded and failures retry after the cooldown", async (t) => {
  let calls = 0, now = 1000;
  t.mock.method(Date, "now", () => now);
  mockFetch(t, async () => { calls++; return decision(); });
  const interpreter = new QueryInterpreter({ subqApiKey: "test-key" });
  for (let i = 0; i < 51; i++) await interpreter.interpret(`the picture number ${i}`, "auto", signal());
  await interpreter.interpret("the picture number 0", "auto", signal());
  assert.equal(calls, 52, "oldest entry is evicted at fifty queries");
  t.mock.restoreAll();
  t.mock.method(Date, "now", () => now);
  mockFetch(t, async () => { calls++; return calls === 53 ? new Response("", { status: 503 }) : decision(); });
  const retry = new QueryInterpreter({ subqApiKey: "test-key" });
  await retry.interpret("the picture at the beach", "auto", signal());
  await retry.interpret("the picture in the park", "auto", signal());
  assert.equal(calls, 53);
  now += 60_001;
  assert.deepEqual(await retry.interpret("the picture in the park", "auto", signal()), { kind: "image" });
  assert.equal(calls, 54);
});

test("captured live decisions retain useful scopes while ambiguous queries remain broad", async (t) => {
  const fixtures = JSON.parse(readFileSync(new URL("fixtures/subq-live-decisions.json", import.meta.url), "utf8")) as {
    query: string; expected: string; response: unknown;
  }[];
  for (const fixture of fixtures) {
    mockFetch(t, async () => new Response(JSON.stringify(fixture.response)));
    const result = await new QueryInterpreter({ subqApiKey: "test-key" }).interpret(fixture.query, "auto", signal());
    assert.equal(result.kind ?? "all", fixture.expected, fixture.query);
    t.mock.restoreAll();
  }
});

function preference(choice: string, confidence = 0.95) {
  return { type: "choice", choice, confidence, probabilities: { [choice]: confidence } };
}

test("ranking guidance works for locally recognized images and manual filters without changing their scope", async (t) => {
  let calls = 0;
  mockFetch(t, async (_url: string, options: RequestInit) => {
    calls++;
    const body = JSON.parse(String(options.body));
    assert.equal(body.state, "show me images of a blue mac wallpaper");
    assert.deepEqual(Object.keys(body.questions).sort(), ["detail", "file_type", "order", "shape"]);
    assert.ok(!String(options.body).includes("/files/"));
    return new Response(JSON.stringify({ answers: { file_type: preference("image"),
      shape: preference("landscape"), detail: preference("large"), order: preference("balanced") } }));
  });
  const interpreter = new QueryInterpreter({ subqApiKey: "test-key" });
  for (const filter of ["auto", "all", "image", "documents", "code"]) {
    assert.deepEqual(await interpreter.interpret("show me images of a blue mac wallpaper", filter, signal()),
      { shape: "landscape", detail: "large" });
  }
  assert.equal(calls, 1, "query-only guidance is cached independently of the manual filter");
});

test("uncertain or malformed ranking preferences are ignored independently of routing", async (t) => {
  for (const shape of [preference("landscape", 0.6), preference("/private/secret"),
    { ...preference("portrait"), confidence: 2 }, { ...preference("square"), probabilities: { square: "1" } }]) {
    mockFetch(t, async () => new Response(JSON.stringify({ answers: {
      file_type: preference("documents"), shape, detail: preference("neutral"), order: preference("newest"),
    } })));
    assert.deepEqual(await new QueryInterpreter({ subqApiKey: "test-key" }).interpret("latest report", "auto", signal()), { kind: "documents", order: "newest" });
    t.mock.restoreAll();
  }
});

test("cached routing cannot override a manually chosen file type", async (t) => {
  mockFetch(t, async () => decision("image"));
  const interpreter = new QueryInterpreter({ subqApiKey: "test-key" });
  assert.deepEqual(await interpreter.interpret("the picture at the beach", "auto", signal()), { kind: "image" });
  assert.deepEqual(await interpreter.interpret("the picture at the beach", "all", signal()), {});
});

test("Jev uses TypeSafe’s native contract and only its own key", async (t) => {
  mockFetch(t, async (url: string, options: RequestInit) => {
    assert.equal(url, "https://api.typesafe.ai/v1/systemone");
    assert.equal((options.headers as Record<string, string>).Authorization, "Bearer jev-test-key");
    const body = JSON.parse(String(options.body));
    assert.equal(body.model, "jev-latest");
    assert.equal(body.state, "the picture at the beach");
    assert.ok(body.questions.shape.criteria.landscape);
    assert.equal(String(options.body).includes("subq-test-key"), false);
    return decision();
  });
  assert.deepEqual(await new QueryInterpreter({ decisionProvider: "jev", jevApiKey: "jev-test-key", subqApiKey: "subq-test-key" })
    .interpret("the picture at the beach", "auto", signal()), { kind: "image" });
});

test("OpenAI Decisions maps named questions, choice arrays and returned probabilities", async (t) => {
  mockFetch(t, async (url: string, options: RequestInit) => {
    assert.equal(url, "https://api.openai.com/v1/decisions");
    assert.equal((options.headers as Record<string, string>).Authorization, "Bearer openai-test-key");
    const body = JSON.parse(String(options.body));
    assert.equal(body.model, "gpt-6-luna");
    assert.equal(body.input, "latest notes");
    assert.equal(body.state, undefined);
    assert.ok(body.questions.find((q: { name: string }) => q.name === "order").choices.some((c: { value: string }) => c.value === "newest"));
    return new Response(JSON.stringify({ answers: [{ type: "choice", name: "file_type", choice: "documents",
      confidence: 0.95, probabilities: [{ value: "documents", probability: 0.95 }] },
      { type: "choice", name: "order", choice: "newest", confidence: 0.95, probabilities: [{ value: "newest", probability: 0.95 }] }] }));
  });
  assert.deepEqual(await new QueryInterpreter({ decisionProvider: "openai", openaiApiKey: "openai-test-key", subqApiKey: "subq-test-key" })
    .interpret("latest notes", "auto", signal()), { kind: "documents", order: "newest" });
});

test("OpenAI refusal, duplicate answers and invalid probabilities safely fall back", async (t) => {
  for (const answers of [[{ type: "refusal", name: "file_type" }],
    ["bad"], [{ name: "__proto__", choice: "image" }],
    [{ ...preference("image"), name: "file_type" }, { ...preference("image"), name: "file_type" }],
    [{ ...preference("image"), name: "file_type", probabilities: [{ value: "image", probability: "1" }] }]]) {
    mockFetch(t, async () => new Response(JSON.stringify({ answers })));
    const result = await new QueryInterpreter({ decisionProvider: "openai", openaiApiKey: "test-key" }).interpret("a picture at the beach", "auto", signal());
    assert.equal(result.kind, undefined);
    assert.match(result.notice!, /OpenAI.*invalid decision/);
    t.mock.restoreAll();
  }
});

test("provider selection never reuses another provider’s key and off never sends queries", async (t) => {
  mockFetch(t, async () => { throw new Error("Must not send"); });
  for (const provider of ["jev", "openai", "off", "invalid"]) {
    const interpreter = new QueryInterpreter({ decisionProvider: provider, subqApiKey: "subq-test-key" });
    assert.equal(interpreter.enabled, false);
    assert.deepEqual(await interpreter.interpret("private search query", "auto", signal()), {});
  }
});

test("local model discovers a model and sends constrained choices only to loopback without hosted keys", async (t) => {
  const calls: string[] = [];
  mockFetch(t, async (url: string, options: RequestInit) => {
    calls.push(url);
    assert.equal((options.headers as Record<string, string> | undefined)?.Authorization, undefined);
    if (url.endsWith("/models")) return new Response(JSON.stringify({ data: [{ id: "local-small-model" }] }));
    const body = JSON.parse(String(options.body));
    assert.equal(body.model, "local-small-model");
    assert.equal(body.messages[1].content, "desktop wallpaper");
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(String(options.body).includes("subq-test-key"), false);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ file_type: "image", order: "balanced", shape: "landscape", detail: "large", filename_literal: "none", filename_match: "contains", format: "none" }) } }] }));
  });
  const result = await new QueryInterpreter({ decisionProvider: "local", subqApiKey: "subq-test-key" }).interpret("desktop wallpaper", "auto", signal());
  assert.deepEqual(result, { kind: "image", shape: "landscape", detail: "large" });
  assert.deepEqual(calls, ["http://127.0.0.1:11434/v1/models", "http://127.0.0.1:11434/v1/chat/completions"]);
});

test("local mode rejects remote endpoints, URL credentials, redirects and invalid choices", async (t) => {
  let calls = 0;
  mockFetch(t, async () => { calls++; throw new Error("Must not send"); });
  for (const url of ["https://example.com/v1", "http://127.0.0.1.evil.example/v1", "http://user:secret@localhost/v1", "file:///tmp/socket", "http://localhost/v1?token=private"]) {
    const result = await new QueryInterpreter({ decisionProvider: "local", localDecisionURL: url }).interpret("a blue wallpaper", "auto", signal());
    assert.match(result.notice!, /loopback/);
  }
  assert.equal(calls, 0);
  t.mock.restoreAll();
  for (const content of ['{"file_type":"/private/secret"}', 'not JSON', '{"file_type":"image","order":"balanced","shape":"landscape","detail":"remote"}']) {
    mockFetch(t, async (_url: string, options: RequestInit) => {
      assert.equal(options.redirect, "error");
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }));
    });
    const result = await new QueryInterpreter({ decisionProvider: "local", localDecisionModel: "test-model" }).interpret("a blue wallpaper", "auto", signal());
    assert.equal(result.kind, undefined);
    assert.match(result.notice!, /Using local search/);
    t.mock.restoreAll();
  }
});

// Routing fixtures exercise the routing adapter; the compositional planner has its own replay and live checks.
function mockFetch(t: TestContext, callback: (url: string, options: RequestInit) => Promise<Response>) {
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    const body = options?.body ? JSON.parse(String(options.body)) : {};
    const done = { type: "choice", choice: "done", confidence: 1, probabilities: { done: 1 } };
    if (body.questions?.operation) return new Response(JSON.stringify({ answers: { operation: done, filename_scope: { ...done, choice: "descriptive", probabilities: { descriptive: 1 } } } }));
    if (Array.isArray(body.questions) && body.questions.some((q: { name: string }) => q.name === "operation")) {
      return new Response(JSON.stringify({ answers: [{ name: "operation", ...done, probabilities: [{ value: "done", probability: 1 }] }, { name: "filename_scope", ...done, choice: "descriptive", probabilities: [{ value: "descriptive", probability: 1 }] }] }));
    }
    if (body.response_format?.json_schema?.schema?.properties?.operation) {
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"operation":"done","filename_scope":"descriptive"}' } }] }));
    }
    return callback(url, options);
  });
}

test("independent plan decisions start while routing is pending; routing failure cancels the plan", async (t) => {
 let release!: () => void, planned = false;
 const gate = new Promise<void>((resolve) => { release = resolve; });
 t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
  const body = JSON.parse(String(options.body));
  if (body.questions.file_type) { await gate; return decision(); }
  planned = true;
  return new Response(JSON.stringify({ answers: { operation: { type: "choice", choice: "done", confidence: 1, probabilities: { done: 1 } }, filename_scope: { type: "choice", choice: "descriptive", confidence: 1, probabilities: { descriptive: 1 } } } }));
 });
 const pending = new QueryInterpreter({ subqApiKey: "test" }).interpret("a sweater picture", "auto", signal());
 await new Promise((resolve) => setImmediate(resolve));
 assert.equal(planned, true, "plan construction must overlap the independent routing request");
 release(); assert.deepEqual(await pending, { kind: "image" });
 t.mock.restoreAll();
 let cancelled = false;
 t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
  const body = JSON.parse(String(options.body));
  if (body.questions.file_type) return new Response("", { status: 503 });
  return new Promise<Response>((_resolve, reject) => options.signal!.addEventListener("abort", () => { cancelled = true; reject(options.signal!.reason); }, { once: true }));
 });
 assert.match((await new QueryInterpreter({ subqApiKey: "test" }).interpret("another sweater", "auto", signal())).notice!, /service error/);
 assert.equal(cancelled, true);
});

test("validated decisions replay across command launches without storing keys or raw queries, and expire", async(t)=>{
 const fs=await import('node:fs'),path=await import('node:path'),os=await import('node:os');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'lens-decisions-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let calls=0,now=10000;t.mock.method(Date,'now',()=>now);
 t.mock.method(globalThis,'fetch',async(_url:string,options:RequestInit)=>{
  calls++;const body=JSON.parse(String(options.body));
  const defaults:Record<string,string>={file_type:'image',order:'balanced',shape:'neutral',detail:'neutral',operation:'done',filename_scope:'descriptive'};
  const answers=Object.fromEntries(Object.entries(body.questions).map(([name,q])=>{
   const choice=defaults[name];return[name,{type:'choice',choice,confidence:1,probabilities:Object.fromEntries(Object.keys((q as {criteria:object}).criteria).map(k=>[k,k===choice?1:0]))}];
  }));return new Response(JSON.stringify({answers}));
 });
 const preferences={subqApiKey:'test-key'},query='the private picture of my holiday';
 const first=await new QueryInterpreter(preferences,root).interpret(query,'auto',signal());assert.equal(calls,2);
 assert.deepEqual(await new QueryInterpreter(preferences,root).interpret(query,'auto',signal()),first);assert.equal(calls,2,'a new command replays the same validated plan without API calls');
 const saved=fs.readFileSync(path.join(root,'index','decision-cache.json'),'utf8');assert.ok(!saved.includes(query)&&!saved.includes('test-key'));
 const manual=await new QueryInterpreter(preferences,root).interpret(query,'documents',signal());assert.equal(manual.kind,undefined);assert.equal(calls,3,'manual scope rebuilds the plan while reusing query-only routing');
 now+=3600001;
 await new QueryInterpreter(preferences,root).interpret(query,'auto',signal());assert.equal(calls,5,'expired decisions return to the provider');
});

test("malformed persisted decisions and failed responses cannot become cached truth",async(t)=>{
 const fs=await import('node:fs'),path=await import('node:path'),os=await import('node:os');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'lens-invalid-decisions-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'index'));fs.writeFileSync(path.join(root,'index','decision-cache.json'),'null');
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status:503});});
 await new QueryInterpreter({subqApiKey:'test'},root).interpret('a private picture','auto',signal());
 const before=calls;await new QueryInterpreter({subqApiKey:'test'},root).interpret('a private picture','auto',signal());assert.ok(calls>before);
 assert.equal(fs.readFileSync(path.join(root,'index','decision-cache.json'),'utf8'),'null','failed HTTP responses are not persisted');
});

test('a complete uncertain medium distribution becomes a soft prior rather than a strict filter or discarded information',async(t)=>{
 const probabilities={all:.347,documents:.604,image:.015,screenshot:.012,video:.011,audio:.006,code:.005};
 t.mock.method(globalThis,'fetch',async(_url:string,options:RequestInit)=>{
  const body=JSON.parse(String(options.body));
  const answer=(choice:string)=>({type:'choice',choice,confidence:1,probabilities:{[choice]:1}});
  return new Response(JSON.stringify({answers:body.questions.file_type?{file_type:{type:'choice',choice:'documents',confidence:.54,probabilities}}:{operation:answer('done'),filename_scope:answer('descriptive')}}));
 });
 const result=await new QueryInterpreter({subqApiKey:'test'}).interpret('an institution assessment','auto',signal());
 assert.equal(result.kind,undefined);assert.equal(result.medium?.documents,.604*.54);assert.equal(result.medium?.video,.011*.54);
});

test('singleton choices are resolved locally, including mixed batches, without invalid provider requests',async(t)=>{
 let calls=0;mockFetch(t,async(_url:string,options:RequestInit)=>{
  calls++;const body=JSON.parse(String(options.body));assert.deepEqual(Object.keys(body.questions),['choice']);
  assert.ok(Object.values(body.questions).every((q:any)=>Object.keys(q.criteria).length>=2));
  return new Response(JSON.stringify({answers:{choice:preference('a')}}));
 });
 const model=new QueryInterpreter({subqApiKey:'test-key'}) as unknown as {request:(text:string,questions:Record<string,unknown>,signal:AbortSignal)=>Promise<Record<string,any>>};
 const only={type:'choice',criteria:{only:'Only valid value'},instructions:'Select the valid value'};
 const known=await model.request('synthetic',{forced:only},signal());assert.equal(calls,0);assert.equal(known.forced.choice,'only');assert.equal(known.forced.confidence,1);
 const mixed=await model.request('synthetic',{forced:only,choice:{type:'choice',criteria:{a:'A',b:'B'}}},signal());
 assert.equal(calls,1);assert.equal(mixed.forced.choice,'only');assert.equal(mixed.choice.choice,'a');
 const abort=new AbortController();abort.abort();await assert.rejects(model.request('synthetic',{forced:only},abort.signal),/abort/i);assert.equal(calls,1);
});
