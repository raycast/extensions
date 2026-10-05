// Exercise the actual TSX component, not a copy of its search logic.
// Run with: node --test test/search-race.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const { outputText } = ts.transpileModule(
  await readFile(new URL("../src/download-model.tsx", import.meta.url), "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
);
const mockExports = {
  react: ["useState", "useRef", "useEffect", "useCallback"],
  "react/jsx-runtime": ["jsx", "jsxs", "Fragment"],
  "@raycast/api": [
    "Action",
    "ActionPanel",
    "Color",
    "Icon",
    "List",
    "showToast",
    "Toast",
  ],
  "./lib/omlx": [
    "fetchRecommendedModels",
    "isOmlxInstalled",
    "isServerRunning",
    "notifyIfUpdateAvailable",
    "searchHfModels",
    "searchMsModels",
    "startHfDownload",
    "startMsDownload",
  ],
};
const dataUri = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
let mountId = 0;

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Drain only microtasks: debounce and toast settlement remain explicitly controlled.
async function settle() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

function model(repo_id) {
  return {
    repo_id,
    downloads: 1,
    params_formatted: "1B",
    size_formatted: "1 GB",
  };
}

async function mount({ installed = true } = {}) {
  const slots = [];
  const effects = [];
  const writes = [];
  const timers = new Map();
  const searches = [];
  const toasts = [];
  const health = deferred();
  const recommendations = deferred();
  let index = 0,
    clock = 0,
    timerId = 0,
    mounted = true;
  let notifications = 0,
    recommendationRequests = 0;
  const element = (type, props) => ({ type, props: props ?? {} });
  const tagged = (name) =>
    Object.assign((props) => element(name, props), { tag: name });
  const List = tagged("List");
  List.EmptyView = tagged("EmptyView");
  List.Item = tagged("Item");
  List.Dropdown = tagged("Dropdown");
  List.Dropdown.Item = tagged("DropdownItem");
  const Action = tagged("Action");
  Action.OpenInBrowser = tagged("OpenInBrowser");
  Action.CopyToClipboard = tagged("CopyToClipboard");
  function search(source, query, limit, mlxOnly) {
    const request = { source, query, limit, mlxOnly, ...deferred() };
    searches.push(request);
    return request.promise;
  }
  const harness = {
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = initial;
      return [
        slots[slot],
        (value) => {
          writes.push({ slot, value, mounted });
          slots[slot] =
            typeof value === "function" ? value(slots[slot]) : value;
        },
      ];
    },
    useRef(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = { current: initial };
      return slots[slot];
    },
    useCallback(callback) {
      index++;
      return callback;
    },
    useEffect(callback, deps) {
      const slot = index++;
      const previous = slots[slot];
      if (
        !previous ||
        deps.some((dep, i) => !Object.is(dep, previous.deps[i]))
      ) {
        slots[slot] = { deps, cleanup: previous?.cleanup };
        effects.push(() => {
          previous?.cleanup?.();
          slots[slot].cleanup = callback();
        });
      }
    },
    jsx: element,
    jsxs: element,
    Fragment: "Fragment",
    List,
    Action,
    ActionPanel: tagged("ActionPanel"),
    Color: { SecondaryText: "secondary" },
    Icon: new Proxy({}, { get: (_, name) => name }),
    Toast: {
      Style: { Failure: "failure", Animated: "animated", Success: "success" },
    },
    showToast(options) {
      const toast = { options, ...deferred() };
      toasts.push(toast);
      return toast.promise;
    },
    isOmlxInstalled: () => installed,
    isServerRunning: () => health.promise,
    notifyIfUpdateAvailable: () => {
      notifications++;
    },
    fetchRecommendedModels: () => {
      recommendationRequests++;
      return recommendations.promise;
    },
    searchHfModels: (query, limit, mlx) =>
      search("huggingface", query, limit, mlx),
    searchMsModels: (query, limit) => search("modelscope", query, limit),
    startHfDownload: async () => {},
    startMsDownload: async () => {},
  };
  harness.setTimeout = (callback, delay) => {
    const id = ++timerId;
    timers.set(id, { callback, at: clock + delay });
    return id;
  };
  harness.clearTimeout = (id) => {
    timers.delete(id);
  };
  const key = `__omlxSearchRace${++mountId}`;
  const header = `const harness = globalThis[${JSON.stringify(key)}];\n`;
  const code = outputText.replace(/from "([^"]+)"/g, (match, path) => {
    assert.ok(mockExports[path], `unexpected component import: ${path}`);
    const mock =
      header +
      mockExports[path]
        .map((name) => `export const ${name} = harness.${name};`)
        .join("\n");
    return `from ${JSON.stringify(dataUri(mock))}`;
  });
  globalThis[key] = harness;
  let Component;
  try {
    ({ default: Component } = await import(
      dataUri(header + "const { setTimeout, clearTimeout } = harness;\n" + code)
    ));
  } finally {
    delete globalThis[key];
  }
  function render() {
    index = 0;
    const tree = Component();
    while (effects.length) effects.shift()();
    return tree;
  }
  function nodes(tree = render()) {
    const found = [];
    function walk(node) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node.type === "function") {
        walk(node.type(node.props));
        return;
      }
      found.push(node);
      walk(node.props.children);
      walk(node.props.actions);
      walk(node.props.searchBarAccessory);
    }
    walk(tree);
    return found;
  }
  render();
  return {
    health,
    recommendations,
    searches,
    toasts,
    writes,
    timers,
    render,
    nodes,
    get notifications() {
      return notifications;
    },
    get recommendationRequests() {
      return recommendationRequests;
    },
    search(text) {
      render().props.onSearchTextChange(text);
    },
    source(value) {
      nodes()
        .find((node) => node.type === "Dropdown")
        .props.onChange(value);
    },
    filter() {
      const action = nodes().find(
        (node) =>
          node.type === "Action" &&
          ["Show All Models", "Mlx Only"].includes(node.props.title),
      );
      assert.ok(action, "filter action is present");
      return action.props.onAction;
    },
    titles() {
      return nodes()
        .filter((node) => node.type === "Item")
        .map((node) => node.props.title);
    },
    empty() {
      return nodes().find((node) => node.type === "EmptyView")?.props.title;
    },
    async advance(ms = 300) {
      clock += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at <= clock) {
          timers.delete(id);
          // Do not await the async callback: network and toast are deferred.
          timer.callback();
        }
      }
      await settle();
    },
    unmount() {
      mounted = false;
      for (const slot of slots) slot?.cleanup?.();
    },
  };
}

async function ready() {
  const app = await mount();
  app.health.resolve(true);
  await settle();
  return app;
}

async function seed(app) {
  app.search("seed");
  await app.advance();
  app.searches.at(-1).resolve([model("seed")]);
  await settle();
}

test("A resolving after B cannot replace B's results", async () => {
  const app = await ready();
  app.search(" A ");
  await app.advance();
  app.search("B");
  await app.advance();
  assert.equal(app.searches[0].query, "A");
  assert.equal(app.searches[0].limit, 20);
  app.searches[1].resolve([model("B")]);
  await settle();
  const writes = app.writes.length;
  app.searches[0].resolve([model("A")]);
  await settle();
  assert.deepEqual(app.titles(), ["B"]);
  assert.equal(app.writes.length, writes);
  assert.equal(app.render().props.isLoading, false);
});

test("clear synchronously invalidates an in-flight search and cancels pending debounce", async () => {
  const app = await ready();
  app.search("A");
  await app.advance();
  app.search("pending");
  app.search("  ");
  const writes = app.writes.length;
  app.searches[0].resolve([model("A")]);
  await app.advance();
  assert.equal(app.searches.length, 1);
  assert.equal(app.writes.length, writes);
  assert.deepEqual(app.titles(), []);
  assert.equal(app.empty(), "Search for Models on HuggingFace");
  assert.equal(app.render().props.isLoading, false);
});

test("source switch invalidates in-flight results before the replacement debounce runs", async () => {
  const app = await ready();
  app.search("query");
  await app.advance();
  app.source("modelscope");
  const writes = app.writes.length;
  app.searches[0].resolve([model("old source")]);
  await settle();
  assert.equal(app.writes.length, writes);
  assert.deepEqual(app.titles(), []);
  assert.equal(app.render().props.isLoading, true);
  await app.advance();
  assert.equal(app.searches[1].source, "modelscope");
  assert.equal(app.searches[1].query, "query");
  app.searches[1].resolve([model("new source")]);
  await settle();
  assert.deepEqual(app.titles(), ["new source"]);
});

test("filter switch invalidates in-flight results synchronously and uses the new filter", async () => {
  const app = await ready();
  await seed(app);
  app.search("query");
  await app.advance();
  app.filter()();
  const writes = app.writes.length;
  app.searches[1].resolve([model("old filter")]);
  await settle();
  assert.equal(app.writes.length, writes);
  assert.deepEqual(app.titles(), ["seed"]);
  assert.equal(app.render().props.isLoading, true);
  await app.advance();
  assert.equal(app.searches[2].mlxOnly, false);
  app.searches[2].resolve([model("all models")]);
  await settle();
  assert.deepEqual(app.titles(), ["all models"]);
});

test("source and filter switches replace pending debounce without starting obsolete requests", async () => {
  const app = await ready();
  await seed(app);
  app.search("pending");
  app.filter()();
  app.source("modelscope");
  await app.advance(299);
  assert.equal(app.searches.length, 1);
  await app.advance(1);
  assert.equal(app.searches.length, 2);
  assert.equal(app.searches[1].source, "modelscope");
  assert.equal(app.searches[1].query, "pending");
});

test("stale failures neither show a toast nor mutate newer search state", async () => {
  const app = await ready();
  app.search("A");
  await app.advance();
  app.search("B");
  const writes = app.writes.length;
  app.searches[0].reject(new Error("obsolete"));
  await settle();
  assert.equal(app.toasts.length, 0);
  assert.equal(app.writes.length, writes);
  assert.equal(app.render().props.isLoading, true);
  await app.advance();
  app.searches[1].resolve([model("B")]);
  await settle();
  assert.deepEqual(app.titles(), ["B"]);
});

for (const transition of ["search", "clear", "source", "filter", "unmount"]) {
  test(`awaited failure toast cannot mutate state after ${transition}`, async () => {
    const app = await ready();
    await seed(app);
    const toggle = app.filter();
    app.search("fails");
    await app.advance();
    app.searches[1].reject(new Error("failure"));
    await settle();
    assert.equal(app.toasts.length, 1);
    assert.equal(app.toasts[0].options.title, "Search failed");
    assert.equal(app.toasts[0].options.style, "failure");
    if (transition === "search") app.search("B");
    if (transition === "clear") app.search("");
    if (transition === "source") app.source("modelscope");
    if (transition === "filter") toggle();
    if (transition === "unmount") app.unmount();
    const writes = app.writes.length;
    app.toasts[0].resolve({});
    await settle();
    assert.equal(app.writes.length, writes);
    assert.equal(
      app.writes.some((write) => !write.mounted),
      false,
    );
    if (["search", "source", "filter"].includes(transition)) {
      assert.equal(app.render().props.isLoading, true);
    }
    if (transition === "clear")
      assert.equal(app.empty(), "Search for Models on HuggingFace");
  });
}

test("current search failure still finishes when its toast settles", async () => {
  const app = await ready();
  app.search("fails");
  await app.advance();
  app.searches[0].reject("not an Error");
  await settle();
  assert.equal(app.toasts[0].options.message, "Unknown error");
  app.toasts[0].resolve({});
  await settle();
  assert.equal(app.render().props.isLoading, false);
  assert.equal(app.empty(), "No Models Found");
});

test("unmount cancels debounce and invalidates both successful and failed in-flight requests", async () => {
  const pending = await ready();
  pending.search("pending");
  pending.unmount();
  const writes = pending.writes.length;
  await pending.advance();
  assert.equal(pending.timers.size, 0);
  assert.equal(pending.searches.length, 0);
  assert.equal(pending.writes.length, writes);
  for (const failure of [false, true]) {
    const app = await ready();
    app.search("in flight");
    await app.advance();
    app.unmount();
    const before = app.writes.length;
    if (failure) app.searches[0].reject(new Error("after unmount"));
    else app.searches[0].resolve([model("after unmount")]);
    await settle();
    assert.equal(app.writes.length, before);
    assert.equal(app.toasts.length, 0);
  }
});

for (const completed of [false, true]) {
  test(`late online health does not overwrite ${completed ? "completed" : "pending"} search`, async () => {
    const app = await mount();
    app.search("current");
    if (completed) {
      await app.advance();
      app.searches[0].resolve([model("current")]);
      await settle();
    }
    const writes = app.writes.length;
    app.health.resolve(true);
    await settle();
    assert.equal(app.writes.length, writes);
    assert.equal(app.render().props.isLoading, !completed);
    assert.deepEqual(app.titles(), completed ? ["current"] : []);
    app.recommendations.resolve({
      trending: [model("trending")],
      popular: [],
    });
    await settle();
    assert.equal(app.render().props.isLoading, !completed);
    assert.deepEqual(app.titles(), completed ? ["current"] : []);
  });
}

for (const empty of [false, true]) {
  test(`late offline health preserves a completed ${empty ? "empty" : "nonempty"} successful search`, async () => {
    const app = await mount();
    app.search("current");
    await app.advance();
    app.searches[0].resolve(empty ? [] : [model("current")]);
    await settle();
    const writes = app.writes.length;
    app.health.resolve(false);
    await settle();
    assert.equal(app.writes.length, writes);
    assert.equal(app.render().props.isLoading, false);
    assert.equal(app.empty(), empty ? "No Models Found" : undefined);
    assert.deepEqual(app.titles(), empty ? [] : ["current"]);
  });
}

for (const empty of [false, true]) {
  test(`superseded query's ${empty ? "empty" : "nonempty"} success is availability evidence without applying stale results`, async () => {
    const app = await mount();
    app.search("old");
    await app.advance();
    app.search("new");
    const writes = app.writes.length;
    app.searches[0].resolve(empty ? [] : [model("old")]);
    await settle();
    assert.equal(app.writes.length, writes);
    app.health.resolve(false);
    await settle();
    assert.equal(app.writes.length, writes);
    assert.equal(app.render().props.isLoading, true);
    assert.equal(app.timers.size, 1);
    assert.deepEqual(app.titles(), []);
    await app.advance();
    app.searches[1].resolve([model("new")]);
    await settle();
    assert.deepEqual(app.titles(), ["new"]);
  });
}

for (const transition of ["search", "clear", "source"]) {
  test(`newer success still supersedes old offline health after ${transition}`, async () => {
    const app = await mount();
    await seed(app);
    if (transition === "search") app.search("next");
    if (transition === "clear") app.search("");
    if (transition === "source") app.source("modelscope");
    const writes = app.writes.length;
    const titles = app.titles();
    const empty = app.empty();
    app.health.resolve(false);
    await settle();
    assert.equal(app.writes.length, writes);
    assert.deepEqual(app.titles(), titles);
    assert.equal(app.empty(), empty);
    assert.equal(app.render().props.isLoading, transition !== "clear");
    if (transition !== "clear") {
      assert.equal(app.timers.size, 1);
      await app.advance();
      app.searches[1].resolve([model("next")]);
      await settle();
      assert.deepEqual(app.titles(), ["next"]);
    }
  });
}

test("completed failed search without success cannot suppress offline health", async () => {
  const app = await mount();
  app.search("fails");
  await app.advance();
  app.searches[0].reject(new Error("failure"));
  await settle();
  app.toasts[0].resolve({});
  await settle();
  assert.equal(app.empty(), "No Models Found");
  app.health.resolve(false);
  await settle();
  assert.equal(app.empty(), "oMLX Server Offline");
  assert.deepEqual(app.titles(), []);
});

// The search request is genuinely unresolved when health turns offline:
// these fail if the offline branch stops invalidating the search
// generation, because the later settlement would pass the guard.
for (const [mode, label] of [
  ["resolve", "resolves"],
  ["reject", "rejects"],
]) {
  test(`late offline health overrides an in-flight search that later ${label}`, async () => {
    const app = await mount();
    app.search("current");
    await app.advance();
    assert.equal(app.searches.length, 1);
    app.health.resolve(false);
    await settle();
    assert.equal(app.timers.size, 0);
    assert.equal(app.empty(), "oMLX Server Offline");
    assert.deepEqual(app.titles(), []);
    const writes = app.writes.length;
    if (mode === "resolve") app.searches[0].resolve([model("late")]);
    else app.searches[0].reject(new Error("server went down"));
    await settle();
    assert.equal(app.writes.length, writes);
    assert.equal(app.toasts.length, 0);
    assert.equal(app.empty(), "oMLX Server Offline");
    assert.deepEqual(app.titles(), []);
  });
}

test("offline health invalidates a failure toast already awaiting settlement", async () => {
  const app = await mount();
  app.search("fails");
  await app.advance();
  app.searches[0].reject(new Error("failure"));
  await settle();
  assert.equal(app.toasts.length, 1);
  assert.equal(app.toasts[0].options.title, "Search failed");
  assert.equal(app.toasts[0].options.style, "failure");
  assert.equal(app.render().props.isLoading, true);
  app.health.resolve(false);
  await settle();
  assert.equal(app.empty(), "oMLX Server Offline");
  const writes = app.writes.length;
  app.toasts[0].resolve({});
  await settle();
  assert.equal(app.writes.length, writes);
  assert.equal(app.toasts.length, 1);
  assert.equal(app.empty(), "oMLX Server Offline");
  assert.deepEqual(app.titles(), []);
});

for (const mode of ["resolve", "reject"]) {
  test(`offline then unmount prevents state writes when an in-flight search ${mode}s`, async () => {
    const app = await mount();
    app.search("current");
    await app.advance();
    assert.equal(app.searches.length, 1);
    app.health.resolve(false);
    await settle();
    assert.equal(app.empty(), "oMLX Server Offline");
    app.unmount();
    const writes = app.writes.length;
    if (mode === "resolve") app.searches[0].resolve([model("late")]);
    else app.searches[0].reject(new Error("after offline and unmount"));
    await settle();
    assert.equal(app.writes.length, writes);
    assert.equal(
      app.writes.some((write) => !write.mounted),
      false,
    );
    assert.equal(app.toasts.length, 0);
    assert.equal(app.timers.size, 0);
  });
}

test("offline health cancels a pending search debounce before it starts", async () => {
  const app = await mount();
  app.search("pending");
  await app.advance(299);
  assert.equal(app.timers.size, 1);
  assert.equal(app.searches.length, 0);
  app.health.resolve(false);
  await settle();
  assert.equal(app.timers.size, 0);
  assert.equal(app.empty(), "oMLX Server Offline");
  const writes = app.writes.length;
  await app.advance(1);
  assert.equal(app.searches.length, 0);
  assert.equal(app.toasts.length, 0);
  assert.equal(app.writes.length, writes);
  assert.equal(app.empty(), "oMLX Server Offline");
  assert.deepEqual(app.titles(), []);
});

for (const transition of ["clear", "source", "typed source"]) {
  test(`${transition} without successful server evidence cannot suppress offline health`, async () => {
    const app = await mount();
    if (transition !== "source") app.search("pending");
    if (transition === "clear") app.search("");
    else app.source("modelscope");
    app.health.resolve(false);
    await settle();
    const writes = app.writes.length;
    await app.advance();
    assert.equal(app.writes.length, writes);
    assert.equal(app.empty(), "oMLX Server Offline");
    assert.equal(app.timers.size, 0);
    assert.equal(app.searches.length, 0);
  });
}

test("empty filter switch invalidates generation even after clearing the query", async () => {
  const app = await ready();
  await seed(app);
  const toggle = app.filter();
  app.search("fails");
  await app.advance();
  app.searches[1].reject(new Error("failure"));
  await settle();
  app.search("");
  // Retain the rendered action as Raycast can dispatch an already-rendered callback.
  toggle();
  const writes = app.writes.length;
  app.toasts[0].resolve({});
  await app.advance();
  assert.equal(app.writes.length, writes);
  assert.equal(app.empty(), "Search for Models on HuggingFace");
  assert.equal(app.timers.size, 0);
});

test("health and recommendations have no post-unmount state updates or startup side effects", async () => {
  for (const running of [false, true]) {
    const app = await mount();
    app.unmount();
    const writes = app.writes.length;
    app.health.resolve(running);
    await settle();
    assert.equal(app.writes.length, writes);
    assert.equal(app.notifications, 0);
    assert.equal(app.recommendationRequests, 0);
  }
  const app = await ready();
  assert.equal(app.recommendationRequests, 1);
  app.unmount();
  const writes = app.writes.length;
  app.recommendations.resolve({ trending: [model("late")], popular: [] });
  await settle();
  assert.equal(app.writes.length, writes);
});

test("ordinary initialization preserves offline, not-installed, and recommendation UI", async () => {
  assert.equal((await mount({ installed: false })).empty(), "oMLX Not Found");
  const offline = await mount();
  offline.health.resolve(false);
  await settle();
  assert.equal(offline.empty(), "oMLX Server Offline");
  const app = await ready();
  app.recommendations.resolve({
    trending: [model("trending")],
    popular: [model("popular")],
  });
  await settle();
  app
    .nodes()
    .find((node) => node.props.title === "View Trending Models")
    .props.onAction();
  assert.deepEqual(app.titles(), ["trending"]);
  app.search("");
  app
    .nodes()
    .find((node) => node.props.title === "View Popular Models")
    .props.onAction();
  assert.deepEqual(app.titles(), ["popular"]);
});
