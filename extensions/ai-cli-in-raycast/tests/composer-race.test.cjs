require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Run production composer callbacks with a deterministic React/Raycast host.
function composer(t, onSend = async () => true, options = {}) {
  const slots = [],
    toasts = [];
  let cursor = 0,
    effect,
    cleanup,
    stopped = 0;
  const react = {
    Fragment: "fragment",
    useRef(value) {
      const id = cursor++;
      if (!(id in slots)) slots[id] = { current: value };
      return slots[id];
    },
    useState(value) {
      const id = cursor++;
      if (!(id in slots)) slots[id] = value;
      return [
        slots[id],
        (next) => {
          slots[id] = typeof next === "function" ? next(slots[id]) : next;
        },
      ];
    },
    useEffect(fn) {
      cursor++;
      effect = fn;
    },
  };
  const jsx = (type, props, key) => ({ type, props, key });
  const Action = Object.assign(() => {}, { CopyToClipboard: "copy" });
  const api = {
    Action,
    ActionPanel: { Submenu: "submenu", Section: "section" },
    Icon: {},
    Toast: { Style: {} },
    showToast: async (toast) => {
      toasts.push(toast);
    },
  };
  const filename = path.resolve(__dirname, "../src/message-composer.tsx");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (id) => {
    if (id === "react") return react;
    if (id === "react/jsx-runtime")
      return { jsx, jsxs: jsx, Fragment: "fragment" };
    if (id === "@raycast/api") return api;
    if (id === "./i18n") return require("../src/i18n.ts");
    throw new Error("Unexpected component dependency: " + id);
  };
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: filename,
    }).outputText,
    filename,
  );
  const props = {
    draft: "",
    busy: false,
    canSteer: false,
    ready: true,
    ...options,
    onChange: (text) => {
      props.draft = text;
    },
    onSend,
    onStop: () => {
      stopped++;
    },
  };
  function render() {
    cursor = 0;
    return loaded.exports.MessageComposer(props);
  }
  function nodes(node) {
    if (Array.isArray(node)) return node.flatMap(nodes);
    return !node || typeof node !== "object"
      ? []
      : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
  }
  function actions() {
    return nodes(render()).filter((node) => node.type === Action);
  }
  render();
  cleanup = effect();
  t.after(() => cleanup?.());
  return {
    open() {
      render().props.onOpen();
      render().props.onSearchTextChange("");
    },
    type(text) {
      render().props.onSearchTextChange(text);
    },
    send() {
      return actions()[0].props.onAction();
    },
    clear() {
      return actions()
        .find((node) => node.props.title === "Clear Draft")
        .props.onAction();
    },
    stop() {
      return actions()
        .find((node) => node.props.title === "Stop Response")
        .props.onAction();
    },
    title: () => render().props.title,
    primary: () => actions()[0].props.title,
    primaryIcon: () => actions()[0].props.icon,
    sharedNodes() {
      render();
      return nodes(props.inputRef.current.content());
    },
    preview: () =>
      nodes(render()).find((node) => node.type === "section").props.title,
    nodes: () => nodes(render()),
    setProps(next) {
      Object.assign(props, next);
      render();
    },
    unmount() {
      cleanup?.();
      cleanup = undefined;
    },
    toasts,
    get draft() {
      return props.draft;
    },
    get stopped() {
      return stopped;
    },
  };
}

test("opening reset preserves an explicitly labeled saved draft including multiline content", async (t) => {
  const raw = "  first\nsecond  ";
  let sent;
  const ui = composer(
    t,
    async (text) => {
      sent = text;
      return true;
    },
    { draft: raw },
  );
  ui.open();
  assert.match(ui.primary(), /^Send Saved Draft: .*first second/);
  assert.equal(ui.preview(), undefined);
  assert.equal(
    ui.nodes().filter((node) => node.type === "section" && node.props.title)
      .length,
    0,
  );
  await ui.send();
  assert.equal(sent, raw);
});

test("an empty visible query cannot secretly send the recoverable draft", async (t) => {
  const sent = [];
  const ui = composer(t, async (text) => {
    sent.push(text);
    return true;
  });
  ui.open();
  ui.type("recover me");
  ui.type("");
  await ui.send();
  assert.deepEqual(sent, []);
  assert.equal(ui.draft, "recover me");
  assert.equal(
    ui.toasts.at(-1).title,
    "Enter a message in the input field first",
  );
  ui.open();
  assert.equal(ui.primary(), "Send Saved Draft: recover me");
  await ui.send();
  assert.deepEqual(sent, ["recover me"]);
});

for (const replacement of ["second message", "first message"])
  test(`late acknowledgement preserves newer ${replacement === "first message" ? "identical" : "different"} input`, async (t) => {
    let accept;
    const sent = [];
    const ui = composer(t, (text) => {
      sent.push(text);
      return sent.length === 1
        ? new Promise((resolve) => {
            accept = resolve;
          })
        : Promise.resolve(true);
    });
    ui.open();
    ui.type("first message");
    const pending = ui.send();
    ui.type("");
    ui.open();
    ui.type(replacement);
    accept(true);
    await pending;
    assert.equal(ui.preview(), undefined);
    assert.equal(ui.draft, replacement);
    await ui.send();
    assert.deepEqual(sent, ["first message", replacement]);
  });

test("failed submission leaves the visible message available for retry", async (t) => {
  const sent = [];
  const ui = composer(t, async (text) => {
    sent.push(text);
    return false;
  });
  ui.open();
  ui.type("retry me");
  await ui.send();
  assert.equal(ui.preview(), undefined);
  assert.equal(ui.draft, "retry me");
  await ui.send();
  assert.deepEqual(sent, ["retry me", "retry me"]);
});

test("duplicate pending submissions call the parent only once", async (t) => {
  let accept,
    count = 0;
  const ui = composer(t, () => {
    count++;
    return new Promise((resolve) => {
      accept = resolve;
    });
  });
  ui.open();
  ui.type("one submission");
  const pending = ui.send();
  await ui.send();
  assert.equal(count, 1);
  accept(true);
  await pending;
});

test("explicit clearing during a pending send cannot be undone by its acknowledgement", async (t) => {
  let accept;
  const ui = composer(
    t,
    () =>
      new Promise((resolve) => {
        accept = resolve;
      }),
  );
  ui.open();
  ui.type("pending");
  const pending = ui.send();
  ui.clear();
  accept(true);
  await pending;
  assert.equal(ui.draft, "");
  assert.equal(ui.preview(), undefined);
  ui.open();
  assert.equal(ui.primary(), "Send Message");
});

test("busy non-steering composer keeps Stop explicit while the primary action waits", async (t) => {
  const ui = composer(t, async () => false, { busy: true, canSteer: false });
  ui.open();
  ui.type("next draft");
  assert.equal(ui.title(), "Write Next Message");
  assert.equal(ui.primary(), "Wait for Response");
  await ui.send();
  assert.equal(ui.stopped, 0);
  assert.equal(ui.draft, "next draft");
  ui.stop();
  assert.equal(ui.stopped, 1);
});

test("a capable busy composer sends additional instructions and exposes Stop separately", async (t) => {
  let sent;
  const ui = composer(
    t,
    async (text) => {
      sent = text;
      return true;
    },
    { busy: true, canSteer: true },
  );
  ui.open();
  ui.type("additional instructions");
  assert.equal(ui.title(), "Add Instructions");
  assert.equal(ui.primary(), "Send Instructions");
  await ui.send();
  assert.equal(sent, "additional instructions");
  assert.equal(ui.stopped, 0);
});

test("unmount suppresses late host input and acknowledgement changes", async (t) => {
  let accept;
  const ui = composer(
    t,
    () =>
      new Promise((resolve) => {
        accept = resolve;
      }),
  );
  ui.open();
  ui.type("pending");
  const pending = ui.send();
  ui.unmount();
  ui.type("stale host input");
  accept(true);
  await pending;
  assert.equal(ui.draft, "pending");
  assert.equal(ui.preview(), undefined);
});

test("ordinary input has no duplicate instruction or pending-preview section title", (t) => {
  const ui = composer(t);
  ui.open();
  assert.equal(ui.preview(), undefined);
  ui.type("visible input already appears in the search field");
  assert.equal(ui.preview(), undefined);
  assert.equal(ui.primary(), "Send Message");
  assert.equal(ui.draft, "visible input already appears in the search field");
  assert.equal(
    ui
      .nodes()
      .some(
        (node) => node.props?.title === "Type a message, press Enter to send",
      ),
    false,
  );
});

test("every composer opening refreshes the catalog through the latest callback", (t) => {
  let original = 0;
  let latest = 0;
  const ui = composer(t, undefined, { onRefreshModels: () => original++ });
  ui.open();
  ui.open();
  assert.equal(original, 2);
  ui.setProps({ onRefreshModels: () => latest++ });
  ui.open();
  assert.equal(original, 2);
  assert.equal(latest, 1);
});

test("the floating input includes independent model and effort controls without changing its send action", async (t) => {
  const sent = [];
  const controls = [
    { type: "model-control", props: { title: "Model" } },
    { type: "effort-control", props: { title: "Effort Level" } },
  ];
  const ui = composer(
    t,
    async (text) => {
      sent.push(text);
      return true;
    },
    { controls },
  );
  ui.open();
  assert.equal(
    ui.nodes().filter((node) => node.type === "model-control").length,
    1,
  );
  assert.equal(
    ui.nodes().filter((node) => node.type === "effort-control").length,
    1,
  );
  ui.type("send this only once");
  await ui.send();
  assert.deepEqual(sent, ["send this only once"]);
});

test("saved draft preview occupies one action row and truncates at 90 Unicode code points", async (t) => {
  const raw = "😀".repeat(110);
  let sent;
  const ui = composer(
    t,
    async (text) => {
      sent = text;
      return true;
    },
    { draft: raw },
  );
  ui.open();
  assert.equal(ui.primary(), "Send Saved Draft: " + "😀".repeat(90));
  assert.equal(
    ui.nodes().filter((node) => node.type === "section" && node.props.title)
      .length,
    0,
  );
  assert.equal(
    ui.nodes().find((node) => node.type === "copy").props.content,
    raw,
  );
  await ui.send();
  assert.equal(sent, raw);
});

test("shared input continuation preserves the draft without sending, clearing or refreshing it", async (t) => {
  const sent = [];
  const inputRef = { current: null };
  let refreshed = 0;
  const ui = composer(
    t,
    async (text) => {
      sent.push(text);
      return false;
    },
    {
      inputRef,
      sendIcon: "provider-gemini.png",
      onRefreshModels: () => refreshed++,
    },
  );
  ui.open();
  assert.equal(
    ui.nodes().find((node) => node.type === "submenu").props.icon,
    "provider-gemini.png",
  );
  ui.type("draft before selecting a model  ");
  const handle = inputRef.current;
  handle.open();
  handle.onSearchTextChange("");
  assert.equal(ui.draft, "draft before selecting a model  ");
  assert.deepEqual(sent, []);
  assert.equal(refreshed, 1);
  assert.match(
    ui.primary(),
    /^Send Saved Draft: draft before selecting a model/,
  );
  inputRef.current.onSearchTextChange("continued through the model submenu  ");
  const sharedSend = ui
    .sharedNodes()
    .find(
      (node) =>
        typeof node.props?.onAction === "function" &&
        node.props.title === "Send Message",
    );
  assert.equal(sharedSend.props.icon, "provider-gemini.png");
  await sharedSend.props.onAction();
  assert.deepEqual(sent, ["continued through the model submenu  "]);
  assert.equal(ui.draft, "continued through the model submenu  ");
  await ui.send();
  assert.deepEqual(sent, [
    "continued through the model submenu  ",
    "continued through the model submenu  ",
  ]);
});

test("clearing through shared input remains discarded when another selection resumes input", (t) => {
  const inputRef = { current: null };
  const ui = composer(t, undefined, {
    inputRef,
    draft: "discard this saved draft",
  });
  ui.open();
  ui.sharedNodes()
    .find((node) => node.props?.title === "Clear Draft")
    .props.onAction();
  inputRef.current.open();
  inputRef.current.onSearchTextChange("");
  assert.equal(ui.draft, "");
  assert.equal(ui.primary(), "Send Message");
});

test("root opening resets lazy controls while continuation keeps the active controls generation", (t) => {
  const inputRef = { current: null };
  const controls = { type: "model-effort-controls", props: {} };
  const ui = composer(t, undefined, { inputRef, controls });
  ui.open();
  const key = () =>
    ui
      .nodes()
      .find(
        (node) => node.type === "fragment" && node.props.children === controls,
      ).key;
  const first = key();
  inputRef.current.open();
  assert.equal(key(), first);
  ui.open();
  assert.notEqual(key(), first);
});

test("shared input and send actions share pending-send and newer-draft protection", async (t) => {
  const inputRef = { current: null };
  let accept;
  const sent = [];
  const ui = composer(
    t,
    (text) => {
      sent.push(text);
      return new Promise((resolve) => {
        accept = resolve;
      });
    },
    { inputRef },
  );
  ui.open();
  ui.type("pending original");
  const pending = ui.send();
  inputRef.current.open();
  inputRef.current.onSearchTextChange("");
  inputRef.current.onSearchTextChange("new shared draft");
  const sharedSend = ui
    .sharedNodes()
    .find((node) => node.props?.title === "Send Message");
  await sharedSend.props.onAction();
  assert.deepEqual(sent, ["pending original"]);
  accept(true);
  await pending;
  assert.equal(ui.draft, "new shared draft");
  assert.equal(ui.primary(), "Send Message");
});

test("unmount retires the shared handle and ignores late continuation callbacks", (t) => {
  const inputRef = { current: null };
  const ui = composer(t, undefined, { inputRef, draft: "preserved draft" });
  ui.open();
  const handle = inputRef.current;
  ui.unmount();
  assert.equal(inputRef.current, null);
  handle.open();
  handle.onSearchTextChange("late input must not win");
  assert.equal(ui.draft, "preserved draft");
});
