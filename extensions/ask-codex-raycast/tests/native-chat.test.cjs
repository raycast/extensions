require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { storageKeys } = require("../src/session-storage.ts");

// Exercise the production chat callbacks; only the Raycast host and transport
// are replaced. Deferred writes reproduce the provider-switch race.
function chat(t, provider = "antigravity", initialDraft = "", options = {}) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const cleanups = new Map();
  const react = {
    useRef(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: value };
      return slots[i];
    },
    useState(value) {
      const i = cursor++;
      if (!(i in slots))
        slots[i] = typeof value === "function" ? value() : value;
      return [
        slots[i],
        (next) => {
          slots[i] = typeof next === "function" ? next(slots[i]) : next;
        },
      ];
    },
    useMemo(fn, deps) {
      const id = cursor++;
      if (
        !slots[id] ||
        deps.some((value, index) => value !== slots[id].deps[index])
      )
        slots[id] = { deps, value: fn() };
      return slots[id].value;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, n) => v !== slots[i][n])) {
        slots[i] = deps;
        effects.push(() => {
          cleanups.get(i)?.();
          cleanups.set(i, fn());
        });
      }
    },
  };
  const keys = storageKeys(provider);
  const saved = new Map([
    [
      keys.model,
      JSON.stringify(
        Object.hasOwn(options, "savedSelection")
          ? options.savedSelection
          : { model: "test-model", effort: "" },
      ),
    ],
  ]);
  if (options.modelPolicy !== undefined)
    saved.set(keys.modelPolicy, JSON.stringify(options.modelPolicy));
  if (initialDraft)
    saved.set(
      keys.library,
      JSON.stringify({
        version: 2,
        activeId: "test-thread",
        sessions: [
          {
            threadId: "test-thread",
            messages: [],
            draft: initialDraft,
            updatedAt: 1,
          },
        ],
      }),
    );
  let writeGate;
  let switched = 0;
  let started = 0;
  let interrupted = 0;
  let event;
  let writeFailure;
  let sendGate;
  let disposed = false;
  const keyedWriteGates = new Map();
  const launches = [];
  const toasts = [];
  const timeline = [];
  const prompts = [],
    instructions = [],
    turnSelections = [];
  let catalog = options.catalog || [
    { model: "test-model", efforts: [], defaultEffort: "" },
    { model: "new-model", efforts: [], defaultEffort: "" },
  ];
  let catalogResponder;
  let catalogCalls = 0;
  const client = {
    currentThreadId: "test-thread",
    currentTurnId: null,
    threadSnapshot: {},
    currentModelSelection: options.currentSelection || {
      model: "test-model",
      effort: "",
    },
    connect: async () => {},
    async startThread() {
      if (options.threadDefault)
        this.currentModelSelection = { ...options.threadDefault };
      return "test-thread";
    },
    resumeThread: async () => "test-thread",
    close() {},
    async listModels() {
      catalogCalls++;
      if (catalogResponder) return catalogResponder();
      return catalog.map((entry) => ({
        ...entry,
        efforts: [...entry.efforts],
      }));
    },
    async startTurn(prompt, selection) {
      if (sendGate) await sendGate;
      started++;
      prompts.push(prompt);
      turnSelections.push(selection ? { ...selection } : selection);
      if (selection) this.currentModelSelection = { ...selection };
      this.currentTurnId = "turn";
      event({
        method: "turn/started",
        params: { threadId: this.currentThreadId, turn: { id: "turn" } },
      });
    },
    async steer(prompt) {
      instructions.push(prompt);
    },
    async interrupt() {
      interrupted++;
      this.currentTurnId = null;
      event({
        method: "turn/completed",
        params: {
          threadId: this.currentThreadId,
          turn: { id: "turn", status: "interrupted" },
        },
      });
    },
  };
  const jsx = (type, props) => ({ type, props });
  const Action = Object.assign(() => {}, {
    Push: "push",
    OpenInBrowser: "browser",
    CopyToClipboard: "copy",
  });
  const api = {
    Action,
    ActionPanel: Object.assign(() => {}, { Section: "section" }),
    Detail: "detail",
    List: Object.assign(() => {}, {
      Item: Object.assign(() => {}, { Detail: "item-detail" }),
      Section: "list-section",
      EmptyView: "empty",
    }),
    environment: { assetsPath: "/assets" },
    getPreferenceValues: () => ({ uiLanguage: "en", ...options.preferences }),
    Icon: {},
    Keyboard: { Shortcut: { Common: {} } },
    Toast: { Style: {} },
    showToast: async (toast) => {
      toasts.push(toast);
    },
    updateCommandMetadata: async () => {},
    LaunchType: { UserInitiated: "user" },
    launchCommand: async (options) => {
      launches.push(options);
      timeline.push("launch");
    },
    LocalStorage: {
      getItem: async (key) => saved.get(key),
      setItem: async (key, value) => {
        if (writeGate) await writeGate;
        if (keyedWriteGates.has(key)) await keyedWriteGates.get(key);
        if (writeFailure === key) throw new Error("storage refused");
        saved.set(key, value);
        timeline.push(key);
      },
    },
  };
  const filename = path.resolve(__dirname, "../src/index.tsx");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (id) => {
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (id === "@raycast/api") return api;
    if (id === "./provider")
      return {
        createProviderClient: (_, options) => {
          event = options.onEvent;
          return client;
        },
        providerCapabilities: (p) => ({
          label: p === "codex" ? "Codex" : "Antigravity",
          supportsSteering: p === "codex",
        }),
        providerIcon: (p) => `provider-${p}.png`,
      };
    if (id === "./provider-menu") return { ProviderMenu: "providers" };
    if (id === "./message-composer") return { MessageComposer: "composer" };
    if (id === "./model-menu")
      return { ModelMenu: "models", EffortMenu: "efforts" };
    if (id === "./setup") return { SetupWizard: "setup" };
    if (id === "./model-settings") return { ModelSettings: "model-settings" };
    if (id === "./history") return { useSessionHistory: () => ({}) };
    return require(path.resolve(path.dirname(filename), id + ".ts"));
  };
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  loaded._compile(source + "\nexports.NativeChat = NativeChat;", filename);
  const props = {
    provider,
    arguments: {},
    onProviderChange: async () => {
      switched++;
    },
    onConfigure() {},
    onPromptConsumed() {},
  };
  function render() {
    cursor = 0;
    const tree = loaded.exports.NativeChat(props);
    const pending = effects;
    effects = [];
    pending.forEach((fn) => fn());
    return tree;
  }
  function nodes(node) {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!node || typeof node !== "object") return [];
    return [
      node,
      ...[
        node.props?.children,
        node.props?.actions,
        node.props?.detail,
        node.props?.controls,
      ]
        .flat(Infinity)
        .flatMap(nodes),
    ];
  }
  function find(type) {
    return nodes(render()).find((node) => node.type === type).props;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const cleanup of cleanups.values()) cleanup?.();
  }
  t.after(dispose);
  return {
    async ready() {
      render();
      for (let n = 0; n < 5; n++) {
        await new Promise(setImmediate);
        render();
      }
      assert.equal(find("composer").ready, true);
    },
    input: () => find("composer"),
    view: () => render(),
    menuCounts: () => {
      const tree = nodes(render());
      return {
        composers: tree.filter((node) => node.type === "composer").length,
        models: tree.filter((node) => node.type === "models").length,
        efforts: tree.filter((node) => node.type === "efforts").length,
        providers: tree.filter((node) => node.type === "providers").length,
      };
    },
    send: (text) => {
      if (text !== undefined && text !== find("composer").draft)
        find("composer").onChange(text);
      const input = find("composer");
      return input.onSend(input.draft);
    },
    clear: () => find("composer").onChange(""),
    providers: () => find("providers"),
    models: () => find("models"),
    efforts: () => find("efforts"),
    allModelControls: () =>
      nodes(render()).filter(
        (node) => node.type === "models" || node.type === "efforts",
      ),
    controls: () => nodes(find("composer").controls),
    async flush() {
      for (let n = 0; n < 4; n++) {
        await new Promise(setImmediate);
        render();
      }
    },
    setCatalog(next) {
      catalog = next;
      catalogResponder = undefined;
    },
    failCatalog(message = "catalog unavailable") {
      catalogResponder = async () => {
        throw new Error(message);
      };
    },
    deferCatalog() {
      let resolve, reject;
      const gate = new Promise((done, fail) => {
        resolve = done;
        reject = fail;
      });
      catalogResponder = () => gate;
      return {
        resolve(next) {
          catalog = next;
          catalogResponder = undefined;
          resolve(next);
        },
        reject(message = "catalog unavailable") {
          catalogResponder = undefined;
          reject(new Error(message));
        },
      };
    },
    markdown: () => render().props.markdown,
    stop: () =>
      nodes(render())
        .find(
          (node) =>
            node.type === Action && node.props.title === "Stop Response",
        )
        .props.onAction(),
    settings: () =>
      nodes(render())
        .find(
          (node) => node.type === Action && node.props.title === "CLI Settings",
        )
        .props.onAction(),
    newChat: () =>
      nodes(render())
        .find((node) => node.type === Action && node.props.title === "New Chat")
        .props.onAction(),
    blockWrites() {
      let release;
      writeGate = new Promise((resolve) => {
        release = resolve;
      });
      return () => {
        release();
        writeGate = null;
      };
    },
    blockWrite(kind) {
      const key = keys[kind];
      let release;
      keyedWriteGates.set(
        key,
        new Promise((resolve) => {
          release = resolve;
        }),
      );
      return () => {
        release();
        keyedWriteGates.delete(key);
      };
    },
    failWrites(kind) {
      writeFailure = kind ? keys[kind] : undefined;
    },
    blockSend() {
      let resolve, reject;
      sendGate = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      });
      return {
        accept: () => resolve(),
        reject: () => reject(new Error("send refused")),
      };
    },
    saved,
    keys,
    launches,
    toasts,
    timeline,
    prompts,
    instructions,
    turnSelections,
    delta(text) {
      event({
        method: "item/agentMessage/delta",
        params: {
          threadId: client.currentThreadId,
          itemId: `reply-${started}`,
          delta: text,
        },
      });
    },
    complete() {
      client.currentTurnId = null;
      event({
        method: "turn/completed",
        params: {
          threadId: client.currentThreadId,
          turn: { id: "turn", status: "completed" },
        },
      });
    },
    dispose,
    get switched() {
      return switched;
    },
    get started() {
      return started;
    },
    get interrupted() {
      return interrupted;
    },
    get catalogCalls() {
      return catalogCalls;
    },
  };
}

test("native conversation uses full-width Markdown and one floating composer", async (t) => {
  const ui = chat(t);
  await ui.ready();
  assert.equal(ui.view().type, "detail");
  assert.equal(ui.view().props.metadata, undefined);
  assert.deepEqual(ui.menuCounts(), {
    composers: 1,
    models: 2,
    efforts: 2,
    providers: 1,
  });
  ui.input().onChange("literal $HOME text");
  await ui.send();
  assert.deepEqual(ui.prompts, ["literal $HOME text"]);
  assert.equal(ui.input().draft, "");
  assert.match(ui.markdown(), /literal \$HOME text/);
});

test("two exchanges and streaming Markdown remain complete without multiplying controls", async (t) => {
  const ui = chat(t);
  await ui.ready();
  await ui.send("first question");
  ui.delta("first answer");
  ui.complete();
  await ui.send("second question");
  ui.delta("second ");
  assert.match(ui.markdown(), /second /);
  ui.delta("answer");
  ui.complete();
  const output = ui.markdown();
  assert.ok(
    output.indexOf("second question") < output.indexOf("second answer"),
  );
  assert.ok(output.indexOf("second answer") < output.indexOf("first question"));
  assert.ok(output.indexOf("first question") < output.indexOf("first answer"));
  ui.input().onChange("unrelated draft");
  assert.equal(ui.markdown(), output);
  assert.deepEqual(ui.menuCounts(), {
    composers: 1,
    models: 2,
    efforts: 2,
    providers: 1,
  });
  await ui.send();
  assert.deepEqual(ui.prompts, [
    "first question",
    "second question",
    "unrelated draft",
  ]);
});

test("non-steering reply permits drafting but neither auto-sends nor makes Stop the Enter action", async (t) => {
  const ui = chat(t);
  await ui.ready();
  await ui.send("first");
  ui.input().onChange("next draft");
  assert.equal(ui.input().busy, true);
  assert.equal(ui.input().canSteer, false);
  await ui.send();
  assert.equal(ui.interrupted, 0);
  assert.equal(ui.started, 1);
  assert.equal(ui.input().draft, "next draft");
  ui.complete();
  await new Promise(setImmediate);
  assert.equal(ui.started, 1);
  assert.equal(ui.input().busy, false);
  await ui.send();
  assert.deepEqual(ui.prompts, ["first", "next draft"]);
});

test("steering is available only for a capable active provider", async (t) => {
  const ui = chat(t, "codex");
  await ui.ready();
  await ui.send("first");
  ui.input().onChange("additional instructions");
  assert.equal(ui.input().busy, true);
  assert.equal(ui.input().canSteer, true);
  await ui.send();
  assert.deepEqual(ui.instructions, ["additional instructions"]);
  assert.deepEqual(ui.prompts, ["first"]);
});

test("restored multiline draft can be edited and sent without truncating its content", async (t) => {
  const raw =
    "  first\r\n" + "\x60\x60\x60raw\n**still visible**\n\x60\x60\x60\nlast  ";
  const ui = chat(t, "antigravity", raw);
  await ui.ready();
  assert.equal(ui.input().draft, raw);
  const edited = raw + "\nnew line";
  ui.input().onChange(edited);
  assert.equal(ui.input().draft, edited);
  await ui.send();
  assert.deepEqual(ui.prompts, [edited]);
});

for (const next of ["new draft", "pending message", ""])
  test(`send acknowledgement preserves newer draft edits: ${next || "explicit clear"}`, async (t) => {
    const ui = chat(t);
    await ui.ready();
    ui.input().onChange("pending message");
    const gate = ui.blockSend();
    const sending = ui.send("pending message");
    await new Promise(setImmediate);
    assert.equal(ui.input().draft, "pending message");
    ui.input().onChange(next);
    gate.accept();
    await sending;
    assert.equal(ui.input().draft, next);
  });

test("failed send cannot restore input deliberately cleared while waiting", async (t) => {
  const ui = chat(t);
  await ui.ready();
  ui.input().onChange("pending message");
  const gate = ui.blockSend();
  const sending = ui.send("pending message");
  await new Promise(setImmediate);
  ui.input().onChange("");
  gate.reject();
  await sending;
  assert.equal(ui.input().draft, "");
});

test("unacknowledged input is persisted when the command closes", async (t) => {
  const ui = chat(t);
  await ui.ready();
  ui.input().onChange("keep until accepted");
  const gate = ui.blockSend();
  const sending = ui.send("keep until accepted");
  await new Promise(setImmediate);
  ui.input();
  ui.dispose();
  gate.accept();
  await sending;
  await new Promise(setImmediate);
  assert.equal(
    JSON.parse(ui.saved.get(ui.keys.library)).sessions[0].draft,
    "keep until accepted",
  );
});

test("provider switch blocks sending and another switch until old storage is durable", async (t) => {
  const ui = chat(t);
  await ui.ready();
  ui.input().onChange("unsent draft");
  const release = ui.blockWrites();
  const switching = ui.providers().onSelect("codex");
  await ui.send();
  await ui.providers().onSelect("codex");
  assert.equal(ui.started, 0);
  assert.equal(ui.switched, 0);
  release();
  await switching;
  assert.equal(ui.switched, 1);
});

test("selecting the current provider is a no-op and an active reply blocks switching", async (t) => {
  const ui = chat(t);
  await ui.ready();
  await ui.providers().onSelect("antigravity");
  assert.equal(ui.switched, 0);
  await ui.send("hello");
  assert.equal(ui.started, 1);
  await ui.providers().onSelect("codex");
  assert.equal(ui.switched, 0);
});

for (const provider of ["codex", "antigravity"])
  test(`${provider} stop completion cannot be overwritten by a late stopping label`, async (t) => {
    const ui = chat(t, provider);
    await ui.ready();
    await ui.send("hello");
    if (provider === "antigravity") assert.doesNotMatch(ui.markdown(), /steer/);
    await ui.stop();
    assert.match(ui.markdown(), /Stopped/);
    assert.doesNotMatch(ui.markdown(), /Stopping/);
  });

test("opening CLI Settings during a reply neither launches another command nor interrupts the reply", async (t) => {
  const ui = chat(t);
  await ui.ready();
  await ui.send("continue this reply");
  await ui.settings();
  assert.deepEqual(ui.launches, []);
  assert.equal(ui.interrupted, 0);
  assert.match(ui.toasts.at(-1).title, /Stop the Current Reply First/);
});

test("CLI Settings waits for the latest draft and model to be saved and locks competing actions", async (t) => {
  const ui = chat(t);
  await ui.ready();
  const releaseLibrary = ui.blockWrite("library");
  const releaseModel = ui.blockWrite("model");
  ui.input().onChange("draft kept before settings");
  ui.models().onSelect({ model: "new-model", effort: "" });
  const pending = ui.settings();
  await new Promise(setImmediate);
  await ui.send();
  await ui.providers().onSelect("codex");
  await ui.settings();
  assert.equal(ui.switched, 0);
  assert.equal(ui.started, 0);
  assert.deepEqual(ui.launches, []);
  releaseLibrary();
  await new Promise(setImmediate);
  assert.deepEqual(ui.launches, []);
  releaseModel();
  await pending;
  assert.equal(
    JSON.parse(ui.saved.get(ui.keys.library)).sessions[0].draft,
    "draft kept before settings",
  );
  assert.deepEqual(JSON.parse(ui.saved.get(ui.keys.model)), {
    model: "new-model",
    effort: "",
  });
  assert.deepEqual(ui.launches, [
    { name: "cli-hub", type: "user", context: { view: "cli-settings" } },
  ]);
  const launchIndex = ui.timeline.indexOf("launch");
  assert.ok(ui.timeline.lastIndexOf(ui.keys.library) < launchIndex);
  assert.ok(ui.timeline.lastIndexOf(ui.keys.model) < launchIndex);
});

for (const kind of ["library", "model"])
  test(`CLI Settings does not launch when ${kind} persistence fails and permits a successful retry`, async (t) => {
    const ui = chat(t);
    await ui.ready();
    ui.input().onChange("preserve after failed save");
    ui.failWrites(kind);
    if (kind === "model")
      ui.models().onSelect({ model: "new-model", effort: "" });
    await ui.settings();
    assert.deepEqual(ui.launches, []);
    assert.equal(ui.input().draft, "preserve after failed save");
    assert.equal(ui.toasts.at(-1).title, "Could Not Open CLI Settings");
    assert.equal(ui.toasts.at(-1).message, "storage refused");
    ui.failWrites();
    if (kind === "model")
      ui.models().onSelect({ model: "new-model", effort: "" });
    await ui.settings();
    assert.equal(ui.launches.length, 1);
  });

test("CLI Settings does not launch after the conversation closes during a pending save", async (t) => {
  const ui = chat(t);
  await ui.ready();
  ui.input().onChange("saved on close");
  const release = ui.blockWrites();
  const pending = ui.settings();
  ui.dispose();
  release();
  await pending;
  assert.deepEqual(ui.launches, []);
});

function catalogEntry(model, efforts = []) {
  return { model, efforts, defaultEffort: efforts[0] || "" };
}

test("a non-steering provider has independent composer model and effort controls", async (t) => {
  const ui = chat(t, "antigravity");
  await ui.ready();
  const controls = ui.controls();
  assert.equal(controls.filter((node) => node.type === "models").length, 1);
  assert.equal(controls.filter((node) => node.type === "efforts").length, 1);
  assert.equal(typeof ui.input().onRefreshModels, "function");
  assert.equal(typeof ui.models().onRefresh, "function");
  assert.equal(typeof ui.efforts().onRefresh, "function");
});

test("reopening refreshes the CLI catalog and both menus receive the returned data", async (t) => {
  const ui = chat(t);
  await ui.ready();
  const before = ui.catalogCalls;
  const replacement = [catalogEntry("replacement-model")];
  ui.setCatalog(replacement);
  ui.input().onRefreshModels();
  assert.deepEqual(ui.models().models, []);
  assert.equal(ui.models().loading, true);
  await ui.flush();
  assert.equal(ui.catalogCalls, before + 1);
  assert.deepEqual(ui.models().models, replacement);
  assert.deepEqual(ui.efforts().models, replacement);
  ui.models().onSelect({ model: "replacement-model", effort: "" });
  await ui.flush();
  assert.deepEqual(JSON.parse(ui.saved.get(ui.keys.model)), {
    model: "replacement-model",
    effort: "",
  });
  ui.input().onRefreshModels();
  await ui.flush();
  assert.equal(ui.catalogCalls, before + 2);
});

test("a failed catalog refresh clears stale choices and prevents their persistence or use", async (t) => {
  const ui = chat(t);
  await ui.ready();
  const staleSelect = ui.models().onSelect;
  const previous = ui.saved.get(ui.keys.model);
  const writes = ui.timeline.filter((key) => key === ui.keys.model).length;
  ui.failCatalog("the CLI model catalog is offline");
  ui.models().onRefresh();
  assert.deepEqual(ui.models().models, []);
  await ui.flush();
  assert.deepEqual(ui.models().models, []);
  assert.deepEqual(ui.efforts().models, []);
  assert.match(ui.models().error, /catalog is offline/);
  assert.equal(ui.models().loading, false);
  staleSelect({ model: "new-model", effort: "" });
  await ui.flush();
  assert.equal(ui.saved.get(ui.keys.model), previous);
  assert.equal(
    ui.timeline.filter((key) => key === ui.keys.model).length,
    writes,
  );
  await ui.send("preserve this message for retry");
  assert.equal(ui.started, 0);
  assert.equal(ui.input().draft, "preserve this message for retry");
});

test("invalid model IDs and unsupported effort levels never persist a selection", async (t) => {
  const ui = chat(t, "codex");
  await ui.ready();
  ui.setCatalog([catalogEntry("test-model", ["low", "high"])]);
  ui.models().onRefresh();
  await ui.flush();
  const before = ui.saved.get(ui.keys.model);
  const writes = ui.timeline.filter((key) => key === ui.keys.model).length;
  ui.models().onSelect({ model: "invented-model", effort: "low" });
  ui.efforts().onSelect({ model: "test-model", effort: "ultra" });
  ui.efforts().onSelect({ model: "test-model", effort: "" });
  await ui.flush();
  assert.equal(ui.saved.get(ui.keys.model), before);
  assert.equal(
    ui.timeline.filter((key) => key === ui.keys.model).length,
    writes,
  );
  ui.efforts().onSelect({ model: "test-model", effort: "high" });
  await ui.flush();
  assert.deepEqual(JSON.parse(ui.saved.get(ui.keys.model)), {
    model: "test-model",
    effort: "high",
  });
});

test("a stale menu callback validates against the refreshed model and effort membership", async (t) => {
  const ui = chat(t, "codex");
  await ui.ready();
  ui.setCatalog([
    catalogEntry("test-model", ["low", "high"]),
    catalogEntry("new-model"),
  ]);
  ui.models().onRefresh();
  await ui.flush();
  const oldSelect = ui.models().onSelect;
  oldSelect({ model: "test-model", effort: "high" });
  await ui.flush();
  const previous = ui.saved.get(ui.keys.model);
  const writes = ui.timeline.filter((key) => key === ui.keys.model).length;
  ui.setCatalog([catalogEntry("test-model", ["low"])]);
  ui.efforts().onRefresh();
  await ui.flush();
  oldSelect({ model: "new-model", effort: "" });
  oldSelect({ model: "test-model", effort: "high" });
  await ui.flush();
  assert.equal(ui.saved.get(ui.keys.model), previous);
  assert.equal(
    ui.timeline.filter((key) => key === ui.keys.model).length,
    writes,
  );
  ui.efforts().onSelect({ model: "test-model", effort: "low" });
  await ui.flush();
  assert.deepEqual(ui.models().selection, {
    model: "test-model",
    effort: "low",
  });
});

test("in-flight and empty catalogs cannot authorize model persistence", async (t) => {
  const ui = chat(t);
  await ui.ready();
  const previous = ui.saved.get(ui.keys.model);
  const writes = ui.timeline.filter((key) => key === ui.keys.model).length;
  const gate = ui.deferCatalog();
  ui.models().onRefresh();
  ui.models().onSelect({ model: "new-model", effort: "" });
  await ui.flush();
  assert.equal(ui.models().loading, true);
  assert.equal(ui.saved.get(ui.keys.model), previous);
  gate.resolve([]);
  await ui.flush();
  ui.models().onSelect({ model: "new-model", effort: "" });
  await ui.flush();
  assert.equal(ui.saved.get(ui.keys.model), previous);
  assert.equal(
    ui.timeline.filter((key) => key === ui.keys.model).length,
    writes,
  );
});

test("concurrent composer/model/effort refreshes deduplicate one CLI request", async (t) => {
  const ui = chat(t);
  await ui.ready();
  const before = ui.catalogCalls;
  const gate = ui.deferCatalog();
  ui.input().onRefreshModels();
  ui.models().onRefresh();
  ui.efforts().onRefresh();
  await ui.flush();
  assert.equal(ui.catalogCalls, before + 1);
  assert.equal(ui.models().loading, true);
  assert.deepEqual(ui.models().models, []);
  gate.resolve([catalogEntry("test-model")]);
  await ui.flush();
  assert.equal(ui.models().loading, false);
  assert.deepEqual(ui.models().models, [catalogEntry("test-model")]);
  ui.input().onRefreshModels();
  await ui.flush();
  assert.equal(ui.catalogCalls, before + 2);
});

test("each new message checks a fresh catalog instead of using cached model availability", async (t) => {
  const ui = chat(t);
  await ui.ready();
  const before = ui.catalogCalls;
  await ui.send("first fresh message");
  assert.equal(ui.catalogCalls, before + 1);
  assert.deepEqual(ui.turnSelections, [{ model: "test-model", effort: "" }]);
  ui.complete();
  ui.setCatalog([catalogEntry("replacement-model")]);
  await ui.send("unavailable model must not run");
  assert.equal(ui.catalogCalls, before + 2);
  assert.equal(ui.started, 1);
  assert.equal(ui.input().draft, "unavailable model must not run");
  ui.setCatalog([catalogEntry("test-model")]);
  await ui.send();
  assert.equal(ui.catalogCalls, before + 3);
  assert.equal(ui.started, 2);
});

test("steering retains the active model without requesting a replacement catalog", async (t) => {
  const ui = chat(t, "codex");
  await ui.ready();
  await ui.send("start the original model");
  const before = ui.catalogCalls;
  ui.failCatalog("a new catalog request must not occur for steering");
  await ui.send("keep using this active response");
  assert.equal(ui.catalogCalls, before);
  assert.deepEqual(ui.instructions, ["keep using this active response"]);
  assert.equal(ui.started, 1);
});

test("a non-Codex CLI can persist effort choices reported by its current catalog", async (t) => {
  const ui = chat(t, "antigravity");
  await ui.ready();
  ui.setCatalog([catalogEntry("test-model", ["low", "high"])]);
  ui.efforts().onRefresh();
  await ui.flush();
  assert.deepEqual(ui.efforts().models[0].efforts, ["low", "high"]);
  ui.efforts().onSelect({ model: "test-model", effort: "high" });
  await ui.flush();
  assert.deepEqual(JSON.parse(ui.saved.get(ui.keys.model)), {
    model: "test-model",
    effort: "high",
  });
});

test("a deferred shared catalog failure clears choices and allows the next refresh to retry", async (t) => {
  const ui = chat(t);
  await ui.ready();
  const before = ui.catalogCalls;
  const gate = ui.deferCatalog();
  ui.input().onRefreshModels();
  ui.models().onRefresh();
  await ui.flush();
  assert.equal(ui.catalogCalls, before + 1);
  gate.reject("temporary catalog error");
  await ui.flush();
  assert.deepEqual(ui.models().models, []);
  assert.match(ui.models().error, /temporary catalog error/);
  ui.efforts().onRefresh();
  await ui.flush();
  assert.equal(ui.catalogCalls, before + 2);
  assert.equal(ui.models().loading, false);
  assert.equal(ui.models().error, "");
  assert.deepEqual(
    ui.models().models.map((entry) => entry.model),
    ["test-model", "new-model"],
  );
});

test("closing chat while a send waits for a fresh catalog prevents a late CLI start", async (t) => {
  const ui = chat(t);
  await ui.ready();
  const before = ui.catalogCalls;
  const gate = ui.deferCatalog();
  const sending = ui.send("do not start this after closing");
  await ui.flush();
  assert.equal(ui.catalogCalls, before + 1);
  assert.equal(ui.started, 0);
  ui.dispose();
  gate.resolve([catalogEntry("test-model")]);
  await sending;
  assert.equal(ui.started, 0);
  assert.deepEqual(ui.prompts, []);
});

test("a captured model callback cannot alter storage after CLI Settings starts switching", async (t) => {
  const ui = chat(t);
  await ui.ready();
  const selectFromOldMenu = ui.models().onSelect;
  const release = ui.blockWrite("model");
  selectFromOldMenu({ model: "test-model", effort: "" });
  const pending = ui.settings();
  await ui.flush();
  assert.equal(ui.models().ready, false);
  assert.equal(ui.efforts().ready, false);
  selectFromOldMenu({ model: "new-model", effort: "" });
  await ui.flush();
  assert.deepEqual(ui.launches, []);
  assert.deepEqual(ui.models().selection, { model: "test-model", effort: "" });
  release();
  await pending;
  await ui.flush();
  assert.deepEqual(JSON.parse(ui.saved.get(ui.keys.model)), {
    model: "test-model",
    effort: "",
  });
  assert.equal(ui.timeline.filter((key) => key === ui.keys.model).length, 1);
  assert.deepEqual(ui.launches, [
    { name: "cli-hub", type: "user", context: { view: "cli-settings" } },
  ]);
  assert.ok(
    ui.timeline.lastIndexOf(ui.keys.model) < ui.timeline.indexOf("launch"),
  );
});

test("a fixed default model and effort override the last saved selection when chat opens", async (t) => {
  const fixed = {
    mode: "fixed",
    selection: { model: "new-model", effort: "high" },
  };
  const ui = chat(t, "antigravity", "saved draft", {
    savedSelection: { model: "test-model", effort: "" },
    modelPolicy: fixed,
    catalog: [
      catalogEntry("test-model"),
      catalogEntry("new-model", ["low", "high"]),
    ],
  });
  await ui.ready();
  assert.deepEqual(ui.models().selection, fixed.selection);
  assert.equal(ui.input().draft, "saved draft");
  await ui.send();
  assert.deepEqual(ui.turnSelections, [fixed.selection]);
  assert.deepEqual(JSON.parse(ui.saved.get(ui.keys.modelPolicy)), fixed);
});

test("temporary chat selection does not change the fixed default and New Chat reapplies it", async (t) => {
  const fixed = {
    mode: "fixed",
    selection: { model: "new-model", effort: "high" },
  };
  const ui = chat(t, "antigravity", "", {
    modelPolicy: fixed,
    catalog: [
      catalogEntry("test-model"),
      catalogEntry("new-model", ["low", "high"]),
    ],
  });
  await ui.ready();
  ui.models().onSelect({ model: "test-model", effort: "" });
  await ui.flush();
  assert.deepEqual(ui.models().selection, { model: "test-model", effort: "" });
  assert.deepEqual(JSON.parse(ui.saved.get(ui.keys.modelPolicy)), fixed);
  await ui.send("temporary model for this chat");
  assert.deepEqual(ui.turnSelections, [{ model: "test-model", effort: "" }]);
  ui.complete();
  await ui.newChat();
  assert.deepEqual(ui.models().selection, fixed.selection);
  await ui.send("fixed model for the new chat");
  assert.deepEqual(ui.turnSelections.at(-1), fixed.selection);
  assert.deepEqual(JSON.parse(ui.saved.get(ui.keys.modelPolicy)), fixed);
});

for (const { policy, preferences } of [
  { policy: undefined },
  { policy: { mode: "last", selection: null } },
  {
    policy: { mode: "fixed", selection: { model: "new-model", effort: "" } },
    preferences: { agyModelStrategy: "last" },
  },
]) {
  test(
    (preferences
      ? "native last mode overrides a stored fixed mode"
      : policy
        ? "explicit last mode"
        : "missing policy retains legacy compatibility") +
      " restores the saved choice and keeps temporary selections across New Chat",
    async (t) => {
      const ui = chat(t, "antigravity", "", {
        modelPolicy: policy,
        preferences,
        savedSelection: { model: "new-model", effort: "" },
      });
      await ui.ready();
      assert.deepEqual(ui.models().selection, {
        model: "new-model",
        effort: "",
      });
      ui.models().onSelect({ model: "test-model", effort: "" });
      await ui.flush();
      await ui.newChat();
      assert.deepEqual(ui.models().selection, {
        model: "test-model",
        effort: "",
      });
      await ui.send("use the last chosen model");
      assert.deepEqual(ui.turnSelections, [
        { model: "test-model", effort: "" },
      ]);
    },
  );
}

for (const selection of [
  { model: "unavailable-fixed-model", effort: "" },
  { model: "new-model", effort: "unsupported-effort" },
  { model: "new-model", effort: "" },
  null,
]) {
  test(
    "an invalid fixed default refuses sending instead of silently using the last model: " +
      (selection
        ? selection.model + "/" + selection.effort
        : "missing selection"),
    async (t) => {
      const ui = chat(t, "antigravity", "do not lose this draft", {
        modelPolicy: { mode: "fixed", selection },
        savedSelection: { model: "test-model", effort: "" },
        catalog: [
          catalogEntry("test-model"),
          catalogEntry("new-model", ["low", "high"]),
        ],
      });
      await ui.ready();
      const accepted = await ui.send();
      assert.equal(accepted, false);
      assert.equal(ui.started, 0);
      assert.deepEqual(ui.prompts, []);
      assert.equal(ui.input().draft, "do not lose this draft");
      assert.ok(ui.toasts.length > 0);
      assert.deepEqual(JSON.parse(ui.saved.get(ui.keys.modelPolicy)), {
        mode: "fixed",
        selection,
      });
    },
  );
}

test("Use Current resolves and persists the actual active model and effort", async (t) => {
  const actual = { model: "new-model", effort: "high" };
  const ui = chat(t, "codex", "restored conversation", {
    currentSelection: actual,
    savedSelection: { model: "test-model", effort: "" },
    catalog: [
      catalogEntry("test-model"),
      catalogEntry("new-model", ["low", "high"]),
    ],
  });
  await ui.ready();
  ui.models().onSelect(null);
  await ui.flush();
  assert.deepEqual(ui.models().selection, actual);
  assert.deepEqual(JSON.parse(ui.saved.get(ui.keys.model)), actual);
  await ui.send("keep the actual model");
  assert.deepEqual(ui.turnSelections, [actual]);
});

test("legacy null selection is remembered before New Chat resets the CLI default", async (t) => {
  const actual = { model: "new-model", effort: "high" };
  const cliDefault = { model: "test-model", effort: "" };
  const ui = chat(t, "codex", "old conversation draft", {
    savedSelection: null,
    currentSelection: actual,
    threadDefault: cliDefault,
    catalog: [
      catalogEntry("test-model"),
      catalogEntry("new-model", ["low", "high"]),
    ],
  });
  await ui.ready();
  assert.equal(ui.models().selection, null);
  await ui.newChat();
  await ui.flush();
  assert.deepEqual(ui.models().current, cliDefault);
  assert.deepEqual(ui.models().selection, actual);
  assert.deepEqual(JSON.parse(ui.saved.get(ui.keys.model)), actual);
  await ui.send("continue with the remembered actual model");
  assert.deepEqual(ui.turnSelections, [actual]);
});

test("a successful legacy null send remembers the actual model for later messages", async (t) => {
  const actual = { model: "new-model", effort: "high" };
  const ui = chat(t, "codex", "legacy null message", {
    savedSelection: null,
    currentSelection: actual,
    catalog: [
      catalogEntry("test-model"),
      catalogEntry("new-model", ["low", "high"]),
    ],
  });
  await ui.ready();
  assert.equal(ui.models().selection, null);
  await ui.send();
  await ui.flush();
  assert.deepEqual(ui.turnSelections, [null]);
  assert.deepEqual(ui.models().selection, actual);
  assert.deepEqual(JSON.parse(ui.saved.get(ui.keys.model)), actual);
  ui.complete();
  await ui.send("the next message has an explicit remembered model");
  assert.deepEqual(ui.turnSelections, [null, actual]);
});

test("native fixed mode overrides stored last mode and requires choosing its fixed model", async (t) => {
  const ui = chat(t, "antigravity", "keep this until fixed model is set", {
    preferences: { agyModelStrategy: "fixed" },
    modelPolicy: { mode: "last", selection: null },
    savedSelection: { model: "test-model", effort: "" },
  });
  await ui.ready();
  assert.equal(await ui.send(), false);
  assert.equal(ui.started, 0);
  assert.equal(ui.input().draft, "keep this until fixed model is set");
  assert.match(ui.toasts.at(-1).message, /fixed model/);
});

for (const provider of [
  "codex",
  "antigravity",
  "qoder",
  "qoder-cn",
  "workbuddy",
  "gemini",
]) {
  test(`${provider} main and popup menus use one composer input handle and the matching send icon`, async (t) => {
    const ui = chat(t, provider);
    await ui.ready();
    const input = ui.input();
    assert.equal(input.sendIcon, `provider-${provider}.png`);
    assert.ok(input.inputRef);
    const menus = ui.allModelControls();
    assert.equal(menus.length, 4);
    assert.ok(menus.every((node) => node.props.inputRef === input.inputRef));
    assert.equal(
      ui
        .controls()
        .filter((node) => node.type === "models" || node.type === "efforts")
        .length,
      2,
    );
  });
}
