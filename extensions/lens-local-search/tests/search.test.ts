import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import type { Hit, SearchResult } from "../src/backend.ts";

const build = process.env.DIGUP_TEST_SEARCH;
const require = createRequire(import.meta.url);
type Element = { type: unknown; props: Record<string, unknown> };
function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
}

function command(options: { apiKey?: string; fetch?: typeof fetch } = {}) {
  const component = () => {};
  const surface = () => Object.assign(() => {}, {
    Item: Object.assign(() => {}, { Detail: Object.assign(() => {}, {
      Metadata: Object.assign(() => {}, { Label: component, Separator: component }),
    }) }), Section: component, EmptyView: component,
    Dropdown: Object.assign(() => {}, { Item: component }), Fit: { Contain: "contain" }, Inset: { Small: "sm" },
  });
  const pushed: unknown[] = [];
  let popped = 0;
  const api = {
    environment: { supportPath: "" },
    getPreferenceValues: () => ({ subqApiKey: options.apiKey }),
    openCommandPreferences: async () => {},
    useNavigation: () => ({ push: (node: unknown) => pushed.push(node), pop: () => { popped++; } }),
    Form: Object.assign(() => {}, { Description: component, TextArea: component }),
    Keyboard: { Shortcut: { Common: { ToggleQuickLook: { modifiers: ["cmd"], key: "y" }, OpenWith: { modifiers: ["cmd", "shift"], key: "o" }, Copy: { modifiers: ["cmd", "shift"], key: "c" } } } },
    List: surface(), Grid: surface(), Icon: new Proxy({}, { get: (_target, key) => key }), Color: { SecondaryText: "secondary" },
    Action: { Open: component, ToggleQuickLook: component, ShowInFinder: component, OpenWith: component, CopyToClipboard: component, Push: component },
    ActionPanel: Object.assign(() => {}, { Section: component }),
  };
  let state: unknown[] = [], cursor = 0, stateWrites = 0;
  let effects: (() => void)[] = [];
  const react = {
    useState: (initial: unknown) => {
      const slot = cursor++, values = state;
      if (slot >= values.length) values[slot] = typeof initial === "function" ? initial() : initial;
      return [values[slot], (value: unknown) => { const next = typeof value === "function" ? value(values[slot]) : value; if (!Object.is(next, values[slot])) { stateWrites++; values[slot] = next; } }];
    },
    useRef: (initial: unknown) => {
      const slot = cursor++;
      if (slot >= state.length) state[slot] = { current: initial };
      return state[slot];
    },
    useCallback: (fn: unknown) => {
      const slot = cursor++;
      if (slot >= state.length) state[slot] = fn;
      return state[slot];
    },
    useEffect: (effect: () => void) => { effects.push(effect); },
  };
  const module = { exports: {} as { default: () => Element } };
  runInNewContext(`(function(require,module,exports){${readFileSync(build!, "utf8")}\n})`, {
    process, Buffer, setTimeout, clearTimeout, Error, AbortController, AbortSignal,
    fetch: async (url: string, options_: RequestInit) => {
      const body = options_?.body ? JSON.parse(String(options_.body)) : {};
      if (body.questions?.operation) return new Response(JSON.stringify({ answers: { operation: { type: "choice", choice: "done", confidence: 1, probabilities: { done: 1 } }, filename_scope: { type: "choice", choice: "descriptive", confidence: 1, probabilities: { descriptive: 1 } } } }));
      if (!options.fetch) throw new Error("Unexpected network request");
      return options.fetch(url, options_);
    },
  })
    ((id: string) => id === "@raycast/api" ? api : id === "react" ? react : require(id), module, module.exports);
  return { api, pushed, popped: () => popped, Command: module.exports.default,
    render: (fn: unknown, props: unknown, values: unknown[]) => {
      state = values; cursor = 0; effects = [];
      return (fn as (props: unknown) => Element)(props);
    },
    effects: () => effects, stateWrites: () => stateWrites,
  };
}

const hit: Hit = { path: "/files/photos/128.jpg", kind: "image", segment: "image", segment_id: 1, modified: 1, size: 20, info: {} };
function state(query: string, filter: string, result: SearchResult, service: unknown) {
  Object.assign(service as object, { feedback: { resolve: (q: string) => q, apply: (_q: string, r: SearchResult) => r, correct: () => {}, rate: () => {}, clear: () => {} }, rerank: async (_q: string, r: SearchResult) => r });
  return [query, filter, { roots: ["/files"], codeRoots: ["/code"] }, service, { query, kind: filter, result }, false, undefined, false, 0];
}

test("image intent renders a thumbnail grid, preserves the query and keeps native file actions", { skip: !build }, async () => {
  const app = command();
  const requests: Record<string, unknown>[] = [];
  const service = { request: async (request: Record<string, unknown>) => { requests.push(request); return { image: "/tmp/preview.jpg" }; } };
  const view = app.render(app.Command, {}, state("image of a sweater", "auto", { hits: [hit], strong: 1, meaning: true }, service));
  assert.equal(view.type, app.api.Grid);
  assert.equal(view.props.searchText, "image of a sweater");
  assert.equal(view.props.fit, "contain");
  const result = elements(view).find((node) => (node.props.hit as Hit)?.path === hit.path)!;
  const values: unknown[] = [];
  app.render(result.type, result.props, values);
  app.effects().forEach((effect) => effect());
  await new Promise((resolve) => setImmediate(resolve));
  const item = app.render(result.type, result.props, values);
  assert.equal(item.type, app.api.Grid.Item);
  assert.equal((item.props.content as { value: { source: string } }).value.source, "file:///tmp/preview.jpg");
  assert.equal(item.props.subtitle, "/files/photos");
  assert.equal((item.props.quickLook as { path: string }).path, hit.path);
  assert.equal(requests[0].pixels, 480);
  const actions = item.props.actions as Element;
  const panel = app.render(actions.type, actions.props, []);
  assert.ok(elements(panel).some((node) => node.props.title === "Open File" && node.props.target === hit.path));
  assert.ok(elements(panel).some((node) => node.props.title === "Copy File"));
});

test("all-files override uses a list with folder context; stale text results never render as images", { skip: !build }, () => {
  const app = command();
  const doc = { ...hit, path: "/files/notes/research-notes.md", kind: "doc" };
  const result = { hits: [doc], strong: 1, meaning: true };
  const values = state("image of a sweater", "all", result, {});
  const view = app.render(app.Command, {}, values);
  assert.equal(view.type, app.api.List);
  const match = elements(view).find((node) => (node.props.hit as Hit)?.path === doc.path)!;
  const item = app.render(match.type, match.props, []);
  assert.equal(item.props.subtitle, "/files/notes");
  values[1] = "auto";
  const switched = app.render(app.Command, {}, values);
  assert.equal(switched.type, app.api.Grid);
  assert.equal(elements(switched).some((node) => node.props.hit), false);
  assert.ok(elements(switched).some((node) => String(node.props.description).includes("choose All Files")));
});

test("thumbnail failure leaves Quick Look available and identifies the missing preview", { skip: !build }, async () => {
  const app = command();
  const service = { request: async () => { throw new Error("Unreadable image"); } };
  const view = app.render(app.Command, {}, state("sweater", "image", { hits: [hit], strong: 1, meaning: true }, service));
  const result = elements(view).find((node) => node.props.hit)!;
  const values: unknown[] = [];
  app.render(result.type, result.props, values);
  app.effects().forEach((effect) => effect());
  await new Promise((resolve) => setImmediate(resolve));
  const item = app.render(result.type, result.props, values);
  assert.equal(item.props.subtitle, "Preview unavailable · Use Quick Look");
  assert.equal((item.props.quickLook as { path: string }).path, hit.path);
});

test("local results appear before SubQ; a confident query-only decision switches to the image grid", { skip: !build }, async () => {
  let calls = 0;
  const query = "the picture where I wore that sweater";
  const app = command({ apiKey: "test-key", fetch: async (_url, options) => {
    calls++;
    assert.equal(JSON.parse(String(options?.body)).state, query);
    return new Response(JSON.stringify({ answers: { file_type: {
      type: "choice", choice: "image", confidence: 0.95, probabilities: { image: 0.95 },
    } } }));
  } });
  const searches: string[] = [];
  const service = { search: async (_query: string, kind: string) => {
    searches.push(kind);
    return { hits: [{ ...hit, kind: kind === "image" ? "image" : "doc" }], strong: 1, meaning: true };
  } };
  const values = state(query, "auto", { hits: [], strong: 0, meaning: false }, service);
  app.render(app.Command, {}, values);
  const cleanup = app.effects()[1]() as unknown as () => void;
  try {
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls, 0, "typing pause happens before the cloud request");
    assert.equal(app.render(app.Command, {}, values).type, app.api.List);
    await new Promise((resolve) => setTimeout(resolve, 750));
    const view = app.render(app.Command, {}, values);
    assert.equal(view.type, app.api.Grid);
    assert.deepEqual(searches, ["auto", "image"]);
    assert.ok(elements(view).some((node) => String(node.props.searchLabel).includes("Interpreted by SubQ")));
  } finally { cleanup(); }
});

test("leaving or changing the query before the pause prevents transmission", { skip: !build }, async () => {
  let calls = 0;
  const app = command({ apiKey: "test-key", fetch: async () => { calls++; throw new Error("Must not send"); } });
  const values = state("the picture at the beach", "auto", { hits: [], strong: 0, meaning: false }, {
    search: async () => ({ hits: [], strong: 0, meaning: true }),
  });
  app.render(app.Command, {}, values);
  const cleanup = app.effects()[1]() as unknown as () => void;
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 700));
  assert.equal(calls, 0);
});

test("a failed SubQ request keeps local results and exposes a safe fallback notice", { skip: !build }, async () => {
  const app = command({ apiKey: "test-key", fetch: async () => new Response("private server text", { status: 401 }) });
  const values = state("the picture at the beach", "auto", { hits: [], strong: 0, meaning: false }, {
    search: async () => ({ hits: [hit], strong: 1, meaning: true }),
  });
  app.render(app.Command, {}, values);
  const cleanup = app.effects()[1]() as unknown as () => void;
  try {
    await new Promise((resolve) => setTimeout(resolve, 750));
    const view = app.render(app.Command, {}, values);
    assert.equal(view.type, app.api.List);
    assert.ok(elements(view).some((node) => (node.props.hit as Hit)?.path === hit.path));
    assert.ok(elements(view).some((node) => String(node.props.searchLabel).includes("Using local search")));
    assert.equal(JSON.stringify(view).includes("private server text"), false);
  } finally { cleanup(); }
});

test("SubQ starts after the typing pause while a slow local search is still running", { skip: !build }, async () => {
  let calls = 0, release!: () => void, first = true;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const app = command({ apiKey: "test-key", fetch: async () => {
    calls++;
    return new Response(JSON.stringify({ answers: { file_type: {
      type: "choice", choice: "image", confidence: 0.95, probabilities: { image: 0.95 },
    } } }));
  } });
  const service = { search: async () => {
    if (first) { first = false; await gate; }
    return { hits: [hit], strong: 1, meaning: true };
  } };
  const values = state("the picture at the beach", "auto", { hits: [], strong: 0, meaning: false }, service);
  app.render(app.Command, {}, values);
  const cleanup = app.effects()[1]() as unknown as () => void;
  try {
    await new Promise((resolve) => setTimeout(resolve, 750));
    assert.equal(calls, 1, "cloud interpretation does not wait for local model startup");
    release();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(app.render(app.Command, {}, values).type, app.api.Grid);
  } finally { release(); cleanup(); }
});

test("the automatic filter identifies document, audio and code scopes rather than only images", { skip: !build }, () => {
  const app = command();
  for (const [kind, label] of [["documents", "Documents"], ["audio", "Audio"], ["code", "Code"]]) {
    const values = state("an interpreted query", "auto", { hits: [hit], strong: 1, meaning: true }, {});
    (values[4] as { resolvedKind?: string }).resolvedKind = kind;
    const view = app.render(app.Command, {}, values);
    assert.ok(elements(view.props.searchBarAccessory).some((node) => node.props.title === `Automatic · ${label}`));
  }
});

test("SubQ guidance reranks existing local candidates without overriding the manual type or another search", { skip: !build }, async () => {
  const query = "show me images of a blue mac wallpaper";
  let searches = 0;
  const tall = { ...hit, path: "/files/private/tall.png", score: 5, info: { width: "2765", height: "6144" } };
  const wide = { ...hit, path: "/files/private/wide.png", score: 4.9, info: { width: "3840", height: "2400" } };
  const app = command({ apiKey: "test-key", fetch: async (_url, options) => {
    assert.equal(JSON.parse(String(options?.body)).state, query);
    assert.equal(String(options?.body).includes("/files/"), false, "candidate data never enters the cloud request");
    const choice = (value: string) => ({ type: "choice", choice: value, confidence: 0.99, probabilities: { [value]: 0.99 } });
    return new Response(JSON.stringify({ answers: { file_type: choice("image"), shape: choice("landscape"), detail: choice("large") } }));
  } });
  const local = { hits: [tall, wide], strong: 2, meaning: true };
  const values = state(query, "all", local, { search: async () => { searches++; return local; } });
  app.render(app.Command, {}, values);
  const cleanup = app.effects()[1]() as unknown as () => void;
  try {
    await new Promise((resolve) => setTimeout(resolve, 750));
    const view = app.render(app.Command, {}, values);
    assert.equal(view.type, app.api.List, "All Files remains selected even though SubQ inferred images");
    assert.equal(searches, 2, "keyword preview is followed by one planned semantic search");
    const items = elements(view).filter((node) => node.props.hit).map((node) => (node.props.hit as Hit).path);
    assert.deepEqual(items, [wide.path, tall.path]);
    assert.ok(elements(view).some((node) => typeof node.props.searchLabel === "string" && node.props.searchLabel.includes("ranking guidance")));
  } finally { cleanup(); }
});

test("strict empty results explain filename constraints without suggesting broader semantic matches", { skip: !build }, () => {
  const app = command();
  const view = app.render(app.Command, {}, state("pdfs that have RE in the name", "auto", { hits: [], strong: 0, meaning: false, literal: true }, {}));
  const empty = elements(view).find((node) => node.type === app.api.List.EmptyView)!;
  assert.match(String(empty.props.description), /No indexed files match this interpretation/);
  assert.doesNotMatch(String(empty.props.description), /Try what|All Files/);
});

test("result headers keep status text out of the narrow list heading", { skip: !build }, () => {
  const app = command();
  const result = { hits: [{ ...hit, path: "/files/RE-2026.pdf", kind: "pdf" }], strong: 1, meaning: false, literal: true,
    queryDescription: "PDF · Filename starts with RE" };
  const values = state("pdfs with RE in the beginning of the name", "auto", result, {});
  (values[4] as { notice?: string }).notice = "Interpreted by SubQ · Filename match";
  const view = app.render(app.Command, {}, values);
  const section = elements(view).find((node) => node.type === app.api.List.Section)!;
  assert.equal(section.props.title, "Filtered"); assert.equal(section.props.subtitle, "1 file");
  assert.ok(String(section.props.title).length + String(section.props.subtitle).length < 24);
  const item = elements(view).find((node) => node.props.hit)!;
  assert.equal(item.props.searchLabel, result.queryDescription);
});

test("interpretation can be reviewed and corrected from an empty result without changing folder setup", { skip: !build }, () => {
  const app = command();
  const result = { hits: [], strong: 0, meaning: false, literal: true, queryDescription: "Name starts with RE AND contains 2" };
  const values = state("PDFs beginning with RE", "auto", result, {});
  const view = app.render(app.Command, {}, values);
  const empty = elements(view).find((node) => node.type === app.api.List.EmptyView)!;
  const actions = empty.props.actions as Element;
  const panel = app.render(actions.type, actions.props, []);
  const adjust = elements(panel).find((node) => node.props.title === "Adjust Interpretation")!;
  (adjust.props.onAction as () => void)();
  const target = app.pushed[0] as Element;
  const form = app.render(target.type, target.props, []);
  assert.ok(elements(form).some((node) => node.props.text === result.queryDescription));
  const submit = elements(form.props.actions).find((node) => node.props.title === "Search Again")!;
  (submit.props.onSubmit as (values: unknown) => void)({ query: "PDFs beginning with RE", correction: "The 2 must be in the filename too" });
  assert.equal(values[0], "PDFs beginning with RE\nCorrection: The 2 must be in the filename too");
  assert.equal(app.popped(), 1);
});

test("semantic results do not wait for slow keyword previews or ranking, and selection survives refinement", { skip: !build }, async () => {
  const app = command();
  let keyword!: (value: SearchResult) => void, metadata!: (value: SearchResult) => void, content!: (value: SearchResult) => void;
  const keywordGate = new Promise<SearchResult>((resolve) => { keyword = resolve; });
  const metadataGate = new Promise<SearchResult>((resolve) => { metadata = resolve; });
  const contentGate = new Promise<SearchResult>((resolve) => { content = resolve; });
  const a = { ...hit, path: "/files/a.jpg" }, b = { ...hit, path: "/files/b.jpg" };
  const semantic = { hits: [a, b], strong: 2, meaning: true };
  let contentCalls = 0;
  const service = { search: async (_q: string, _kind: string, _plan: unknown, meaning: boolean) => meaning ? semantic : keywordGate };
  const values = state("blue sweater", "image", { hits: [], strong: 0, meaning: false }, service);
  Object.assign(service, { rerank: async () => { contentCalls++; return contentGate; } });
  values[9] = { enabled: true, label: "SubQ", interpret: async () => ({}), rerank: async () => metadataGate };
  app.render(app.Command, {}, values);
  const cleanup = app.effects()[1]() as unknown as () => void;
  try {
    await new Promise((resolve) => setTimeout(resolve, 380));
    let view = app.render(app.Command, {}, values);
    assert.equal((values[4] as { result: SearchResult }).result, semantic, "semantic results appear before either ranking stage");
    assert.equal(view.props.isLoading, true);
    assert.equal(contentCalls, 0, "content selection still uses completed metadata guidance");
    (view.props.onSelectionChange as (id: string) => void)(b.path);
    keyword({ hits: [hit], strong: 1, meaning: false });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal((values[4] as { result: SearchResult }).result, semantic, "late keyword previews cannot replace semantic matches");
    metadata({ ...semantic, hits: [b, a] });
    await new Promise((resolve) => setImmediate(resolve));
    view = app.render(app.Command, {}, values);
    assert.equal(view.props.selectedItemId, b.path);
    assert.equal(contentCalls, 1);
    content(semantic);
    await new Promise((resolve) => setImmediate(resolve));
    view = app.render(app.Command, {}, values);
    assert.equal(view.props.selectedItemId, b.path, "final model ordering does not move the user's selection");
    assert.equal(view.props.isLoading, false);
  } finally { keyword(semantic); metadata(semantic); content(semantic); cleanup(); }
});

test("failed strict retrieval never falls back to unfiltered keyword files", { skip: !build }, async () => {
  const app = command();
  const values = state("PDFs starting RE", "auto", { hits: [], strong: 0, meaning: false }, {
    search: async (_q: string, _kind: string, _plan: unknown, meaning: boolean) => {
      if (meaning) throw new Error("Retrieval failed");
      return { hits: [hit], strong: 1, meaning: false };
    },
  });
  values[9] = { enabled: true, label: "SubQ", interpret: async () => ({ plan: {
    filter: { op: "name_prefix", value: "RE" }, semantic: "", complete: true, uncertain: false,
  } }), rerank: async () => { throw new Error("must not rank"); } };
  app.render(app.Command, {}, values);
  const cleanup = app.effects()[1]() as unknown as () => void;
  try {
    await new Promise((resolve) => setTimeout(resolve, 380));
    const view = app.render(app.Command, {}, values);
    assert.equal(elements(view).some((node) => node.props.hit), false);
    assert.match(String(elements(view).find((node) => node.type === app.api.List.EmptyView)?.props.description), /starts with.*RE/);
  } finally { cleanup(); }
});

test("changing a query cancels its requests and prevents obsolete ranking work", { skip: !build }, async () => {
  const app = command(); let release!: (result: SearchResult) => void, calls = 0;
  const gate = new Promise<SearchResult>((resolve) => { release = resolve; });
  const result = { hits: [hit], strong: 1, meaning: true };
  let received: AbortSignal | undefined;
  const service = { search: async (_q: string, _kind: string, _plan: unknown, _meaning: boolean, signal: AbortSignal) => { received = signal; return result; } };
  const values = state("a sweater", "image", result, service);
  Object.assign(service, { rerank: async () => { calls++; return result; } });
  values[9] = { enabled: true, label: "SubQ", interpret: async () => ({}), rerank: async () => gate };
  app.render(app.Command, {}, values);
  const cleanup = app.effects()[1]() as unknown as () => void;
  await new Promise((resolve) => setTimeout(resolve, 380));
  const before = values[4]; cleanup();
  assert.equal(received?.aborted, true);
  release(result);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 0); assert.equal(values[4], before);
});

test("repeated native selection echoes do not write React state or change the callback identity", { skip: !build }, () => {
 const app=command(), values=state("blue sweater","image",{hits:[hit],strong:1,meaning:true},{});
 let view=app.render(app.Command,{},values);
 const callback=view.props.onSelectionChange as (id:string|null)=>void;
 const writes=app.stateWrites();
 for(let i=0;i<100;i++){
  callback(hit.path);callback(null);
  view=app.render(app.Command,{},values);
  assert.equal(view.props.onSelectionChange,callback);
  assert.equal(view.props.selectedItemId,hit.path);
 }
 assert.equal(app.stateWrites(),writes,"selection events must not create a controlled-state feedback loop");
 (values[4] as {result:SearchResult}).result={hits:[hit],strong:0,meaning:true};
 view=app.render(app.Command,{},values);
 assert.ok(elements(view).some(node=>(node.props.hit as Hit)?.path===hit.path),"selected results stay visible if refinement moves them to weaker matches");
 assert.ok(elements(view).some(node=>node.props.id==="lens:show-weaker"),"the fold control has a stable native selection identity");
});

test("text details show verified match hints, and changing selection cancels preview work", { skip: !build }, async () => {
 const app=command();let requestSignal:AbortSignal|undefined;
 const doc={...hit,path:"/files/notes.md",kind:"doc",excerpt:"retry the «transaction» safely"};
 const service={request:async(_r:unknown,_t:number,signal:AbortSignal)=>{requestSignal=signal;return {text:"We retry the transaction safely. Cost is $5, not an image."};}};
 const view=app.render(app.Command,{},state("transaction","all",{hits:[doc],strong:1,meaning:true},service));
 const result=elements(view).find(node=>(node.props.hit as Hit)?.path===doc.path)!;
 const item=app.render(result.type,result.props,[]), detail=item.props.detail as Element;
 const values:unknown[]=[];app.render(detail.type,detail.props,values);
 const cleanup=app.effects()[0]() as unknown as ()=>void;
 await new Promise(resolve=>setImmediate(resolve));
 const loaded=app.render(detail.type,detail.props,values);
 assert.match(String(loaded.props.markdown),/Matched words/);assert.match(String(loaded.props.markdown),/\*\*transaction\*\*/);
 assert.ok(String(loaded.props.markdown).includes('\\$5'));
 cleanup();assert.equal(requestSignal?.aborted,true);
});

test('PDF details show the matched words from the selected page beside its page preview', {skip:!build},async()=>{
 const app=command(),pdf={...hit,path:'/files/anonymous.pdf',kind:'pdf',segment:'page',loc:9,excerpt:'«Karnaugh» maps'};
 const requests:Record<string,unknown>[]=[];
 const service={request:async(r:Record<string,unknown>)=>{requests.push(r);return r.op==='render'?{image:'/tmp/page9.jpg'}:{text:'The exam includes Karnaugh maps and Boolean algebra.'};}};
 const view=app.render(app.Command,{},state('digital logic exam','documents',{hits:[pdf],strong:1,meaning:true},service));
 const result=elements(view).find(n=>(n.props.hit as Hit)?.path===pdf.path)!;
 const item=app.render(result.type,result.props,[]),detail=item.props.detail as Element,values:unknown[]=[];
 app.render(detail.type,detail.props,values);app.effects()[0]();await new Promise(resolve=>setImmediate(resolve));
 const loaded=app.render(detail.type,detail.props,values),markdown=String(loaded.props.markdown);
 assert.match(markdown,/\*\*Karnaugh\*\*/);assert.ok(markdown.includes('file:///tmp/page9.jpg'));
 assert.deepEqual(requests.map(r=>r.op),['render','text']);assert.equal(requests[0].loc,9);
});

test('automatic selection follows the new top result while a deliberate choice stays visible once in the sidebar', {skip:!build},()=>{
 const app=command(),a={...hit,path:'/files/a.pdf',kind:'pdf'},b={...hit,path:'/files/b.pdf',kind:'pdf'},c={...hit,path:'/files/c.pdf',kind:'pdf'};
 const values=state('a topic','documents',{hits:[a,b,c],strong:3,meaning:true},{});
 let view=app.render(app.Command,{},values);(view.props.onSelectionChange as (id:string)=>void)(a.path);
 (values[4] as {result:SearchResult}).result={hits:[b,a,c],strong:3,meaning:true};
 view=app.render(app.Command,{},values);assert.equal(view.props.selectedItemId,b.path,'an automatic first choice must not pin the stale preview');
 (view.props.onSelectionChange as (id:string)=>void)(a.path);
 (values[4] as {result:SearchResult}).result={hits:[c,b,a],strong:2,meaning:true};
 view=app.render(app.Command,{},values);assert.equal(view.props.selectedItemId,a.path);
 const matches=elements(view).find(n=>n.props.title==='Matches')!;assert.ok(matches);
 assert.equal((elements(matches).find(n=>n.props.hit)?.props.hit as Hit).path,a.path,'the selected file stays at the front of the visible results');
 assert.equal(elements(view).filter(n=>(n.props.hit as Hit)?.path===a.path).length,1,'pinned sidebar row cannot have a duplicate identity');
});

 test("arrow navigation publishes each new native selection without moving rows or snapping back", { skip: !build }, () => {
  const app = command(), a = { ...hit, path: "/files/a.jpg" }, b = { ...hit, path: "/files/b.jpg" }, c = { ...hit, path: "/files/c.jpg" };
  const values = state("blue sweater", "image", { hits: [a, b, c], strong: 3, meaning: true }, {});
  let view = app.render(app.Command, {}, values);
  const callback = view.props.onSelectionChange as (id: string | null) => void;
  const writes = app.stateWrites();
  for (const id of [b.path, c.path, b.path, a.path]) {
    callback(id);
    view = app.render(app.Command, {}, values);
    assert.equal(view.props.selectedItemId, id, "native arrow movement must not be overwritten by the first result");
    assert.equal(view.props.onSelectionChange, callback);
    assert.equal(elements(view).some(n => n.props.title === "Selected"), false, "navigation must not reorder the list under the cursor");
    const afterMove = app.stateWrites();
    for (let echo = 0; echo < 100; echo++) { callback(id); callback(null); }
    assert.equal(app.stateWrites(), afterMove, "acknowledgements cannot create a render loop");
  }
  assert.equal(app.stateWrites() - writes, 4, "each genuine move must reach React exactly once");
  (values[4] as {result:SearchResult}).result={hits:[c,b,a],strong:2,meaning:true};
  view=app.render(app.Command,{},values);
  assert.equal(view.props.selectedItemId,a.path,"deliberately returning to the original first row is still a manual choice");
  (values[4] as {result:SearchResult}).result={hits:[b,c],strong:2,meaning:true};
  view=app.render(app.Command,{},values);assert.equal(view.props.selectedItemId,b.path);
  (values[4] as {result:SearchResult}).result={hits:[b,c,a],strong:3,meaning:true};
  view=app.render(app.Command,{},values);
  const beforeReturning=app.stateWrites();callback(a.path);
  assert.equal(app.stateWrites(),beforeReturning+1,"a native move must publish even if the same ID was chosen before an automatic fallback");
  view=app.render(app.Command,{},values);assert.equal(view.props.selectedItemId,a.path);
 });

 test('expanding weaker matches clears the now-removed fold selection', {skip:!build},()=>{
  const app=command(),a={...hit,path:'/files/a.jpg'},b={...hit,path:'/files/b.jpg'};
  const values=state('blue sweater','image',{hits:[a,b],strong:1,meaning:true},{});
  let view=app.render(app.Command,{},values);(view.props.onSelectionChange as (id:string)=>void)('lens:show-weaker');
  values[7]=true;view=app.render(app.Command,{},values);
  assert.equal(view.props.selectedItemId,a.path);assert.ok(!elements(view).some(n=>n.props.id==='lens:show-weaker'));
 });
