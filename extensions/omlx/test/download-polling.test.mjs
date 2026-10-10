import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../src/manage-downloads.tsx", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
  },
});
const uri = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
async function settle() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}
let nextMount = 0;
const activeTask = {
  source: "huggingface",
  task_id: "task",
  repo_id: "synthetic/model",
  status: "downloading",
  progress: 25,
  downloaded_size: 1,
  total_size: 4,
};

async function mount() {
  const slots = [],
    effects = [],
    requests = [],
    health = [],
    toasts = [],
    writes = [];
  const intervals = new Map();
  let index = 0,
    intervalId = 0,
    notifications = 0;
  const element = (type, props) => ({ type, props: props ?? {} });
  const tagged = (name) =>
    Object.assign((props) => element(name, props), { tag: name });
  const List = tagged("List");
  for (const name of ["Item", "Section", "EmptyView"])
    List[name] = tagged(name);
  const Action = tagged("Action");
  Action.OpenInBrowser = tagged("OpenInBrowser");
  Action.Style = { Destructive: "destructive" };
  const equal = (a, b) =>
    a && a.length === b.length && b.every((v, i) => Object.is(v, a[i]));
  const mock = {
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = initial;
      return [
        slots[slot],
        (v) => {
          slots[slot] = typeof v === "function" ? v(slots[slot]) : v;
          writes.push(slot);
        },
      ];
    },
    useRef(initial) {
      const slot = index++;
      return (slots[slot] ??= { current: initial });
    },
    useCallback(fn, deps) {
      const slot = index++;
      if (!equal(slots[slot]?.deps, deps)) slots[slot] = { deps, fn };
      return slots[slot].fn;
    },
    useEffect(fn, deps) {
      const slot = index++;
      if (!equal(slots[slot]?.deps, deps)) {
        const prev = slots[slot];
        slots[slot] = { deps };
        effects.push(() => {
          prev?.cleanup?.();
          slots[slot].cleanup = fn();
        });
      }
    },
    jsx: element,
    jsxs: element,
    Fragment: "Fragment",
    List,
    Action,
    ActionPanel: tagged("ActionPanel"),
    Color: new Proxy({}, { get: (_, name) => name }),
    Icon: new Proxy({}, { get: (_, name) => name }),
    Toast: { Style: { Failure: "failure" } },
    showToast(options) {
      const toast = { options, ...deferred() };
      toasts.push(toast);
      return toast.promise;
    },
    isOmlxInstalled: () => true,
    isServerRunning() {
      const req = deferred();
      health.push(req);
      return req.promise;
    },
    fetchDownloads() {
      const req = deferred();
      requests.push(req);
      return req.promise;
    },
    notifyIfUpdateAvailable() {
      notifications++;
    },
    formatBytes: (value) => String(value),
    getDashboardUrl: () => "https://example.invalid",
    cancelHfDownload: async () => {},
    cancelMsDownload: async () => {},
    removeHfTask: async () => {},
    removeMsTask: async () => {},
    retryHfDownload: async () => {},
    retryMsDownload: async () => {},
    setInterval(fn, delay) {
      const id = ++intervalId;
      intervals.set(id, { fn, delay });
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
  };
  const key = `__downloadPolling${++nextMount}`;
  const header = `const mock = globalThis[${JSON.stringify(key)}];\n`;
  // Every import comes from this controlled harness; type imports disappear.
  const code = outputText.replace(
    /import \{([^}]+)\} from "[^"]+";/g,
    (_, names) =>
      names
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const [name, alias = name] = s.split(/\s+as\s+/);
          return `const ${alias} = mock.${name};`;
        })
        .join("\n"),
  );
  globalThis[key] = mock;
  const { default: Component } = await import(
    uri(header + "const { setInterval, clearInterval } = mock;\n" + code)
  );
  delete globalThis[key];
  function render() {
    index = 0;
    const tree = Component();
    while (effects.length) effects.shift()();
    return tree;
  }
  function nodes() {
    const result = [];
    function walk(node) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (typeof node.type === "function") return walk(node.type(node.props));
      result.push(node);
      walk(node.props.children);
      walk(node.props.actions);
    }
    walk(render());
    return result;
  }
  render();
  return {
    health,
    requests,
    toasts,
    writes,
    intervals,
    render,
    async tick() {
      for (const timer of [...intervals.values()]) timer.fn();
      await settle();
    },
    async respond(result) {
      health.at(-1).resolve(true);
      await settle();
      requests.at(-1).resolve(result);
      await settle();
      render();
    },
    empty() {
      return nodes().find((n) => n.type === "EmptyView")?.props.title;
    },
    action(title) {
      return nodes()
        .find((n) => n.type === "Action" && n.props.title === title)
        .props.onAction();
    },
    refresh() {
      nodes()
        .find((n) => n.type === "Action" && n.props.title === "Refresh")
        .props.onAction();
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
    },
    get notifications() {
      return notifications;
    },
  };
}

const partial = {
  tasks: [],
  errors: { modelscope: "Synthetic source failure" },
};
const healthy = { tasks: [], errors: {} };

test("empty partial result polls for recovery and stops once healthy", async () => {
  const app = await mount();
  await app.respond(partial);
  assert.equal(app.empty(), "Download Sources Unavailable");
  assert.deepEqual(
    [...app.intervals.values()].map((t) => t.delay),
    [5000],
  );
  await app.tick();
  await app.respond(healthy);
  assert.equal(app.empty(), "No Downloads");
  assert.equal(app.intervals.size, 0);
  assert.equal(app.toasts.length, 0);
  app.unmount();
});

test("active-only source failure transitions from fast polling to recovery polling", async () => {
  const app = await mount();
  await app.respond({ tasks: [activeTask], errors: {} });
  assert.deepEqual(
    [...app.intervals.values()].map((t) => t.delay),
    [1000],
  );
  await app.tick();
  await app.respond(partial);
  assert.deepEqual(
    [...app.intervals.values()].map((t) => t.delay),
    [5000],
  );
  await app.tick();
  await app.respond({ tasks: [activeTask], errors: {} });
  assert.deepEqual(
    [...app.intervals.values()].map((t) => t.delay),
    [1000],
  );
  app.unmount();
  assert.equal(app.intervals.size, 0);
});

test("slow recovery serializes interval and manual refreshes", async () => {
  const app = await mount();
  await app.respond(partial);
  await app.tick();
  app.health.at(-1).resolve(true);
  await settle();
  assert.equal(app.requests.length, 2);
  await app.tick();
  app.refresh();
  await settle();
  assert.equal(app.health.length, 2);
  assert.equal(app.requests.length, 2);
  app.requests.at(-1).resolve(healthy);
  await settle();
  app.render();
  assert.equal(app.empty(), "No Downloads");
  assert.equal(app.intervals.size, 0);
  assert.equal(app.health.length, 3); // One coalesced manual follow-up.
  await app.respond(healthy);
  assert.equal(app.requests.length, 3);
  app.unmount();
});

for (const action of ["Remove", "Retry Download"]) {
  test(`${action} during a stale snapshot queues a follow-up even when polling stops`, async () => {
    const app = await mount();
    const oldTask = {
      ...activeTask,
      status: action === "Remove" ? "completed" : "failed",
    };
    await app.respond({ tasks: [oldTask], errors: {} });
    app.refresh();
    app.health.at(-1).resolve(true);
    await settle();
    const staleRequest = app.requests.at(-1);
    const operation = app.action(action);
    if (action === "Retry Download") {
      await settle();
      app.toasts.at(-1).resolve({});
    }
    await operation;
    assert.equal(app.health.length, 2);
    staleRequest.resolve({ tasks: [oldTask], errors: {} });
    await settle();
    app.render();
    assert.equal(app.intervals.size, 0);
    assert.equal(app.health.length, 3);
    await app.respond(
      action === "Remove" ? healthy : { tasks: [activeTask], errors: {} },
    );
    assert.equal(app.requests.length, 3);
    if (action === "Remove") assert.equal(app.empty(), "No Downloads");
    else
      assert.deepEqual(
        [...app.intervals.values()].map((timer) => timer.delay),
        [1000],
      );
    app.unmount();
  });
}

for (const stage of ["health", "tasks", "toast"]) {
  test(`unmount during ${stage} prevents late writes and side effects`, async () => {
    const app = await mount();
    await app.respond(partial);
    await app.tick();
    if (stage !== "health") {
      app.health.at(-1).resolve(true);
      await settle();
    }
    if (stage === "toast") {
      app.requests.at(-1).reject(new Error("Synthetic failure"));
      await settle();
    }
    app.unmount();
    assert.equal(app.intervals.size, 0);
    const writes = app.writes.length,
      notifications = app.notifications;
    if (stage === "health") app.health.at(-1).resolve(true);
    else if (stage === "tasks") app.requests.at(-1).resolve(healthy);
    else app.toasts.at(-1).resolve({});
    await settle();
    assert.equal(app.writes.length, writes);
    assert.equal(app.notifications, notifications);
    assert.equal(app.toasts.length, stage === "toast" ? 1 : 0);
  });
}

test("offline health stops recovery polling until manual refresh", async () => {
  const app = await mount();
  await app.respond(partial);
  await app.tick();
  app.health.at(-1).resolve(false);
  await settle();
  assert.equal(app.empty(), "oMLX Server Offline");
  assert.equal(app.intervals.size, 0);
  app.refresh();
  await app.respond(healthy);
  assert.equal(app.empty(), "No Downloads");
  app.unmount();
});
