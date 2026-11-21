require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const model = (name, efforts, defaultEffort = "") => ({
  model: name,
  displayName: name,
  efforts,
  defaultEffort,
});

// Execute production menus and callbacks, replacing only the native host.
function menus(overrides = {}) {
  const references = { ModelMenu: [], EffortMenu: [] };
  let active,
    cursor = 0,
    refreshes = 0;
  const selected = [];
  const react = {
    useRef(value) {
      const slot = cursor++;
      if (!(slot in active)) active[slot] = { current: value };
      return active[slot];
    },
    useState(value) {
      const hooks = active;
      const slot = cursor++;
      if (!(slot in hooks))
        hooks[slot] = typeof value === "function" ? value() : value;
      return [
        hooks[slot],
        (next) => {
          hooks[slot] = typeof next === "function" ? next(hooks[slot]) : next;
        },
      ];
    },
    useEffect(effect) {
      const slot = cursor++;
      if (!(slot in active)) active[slot] = { effect, pending: true };
    },
  };
  const jsx = (type, props, key) => ({ type, props, key });
  const Action = () => {};
  const api = {
    Action,
    ActionPanel: { Submenu: "submenu", Section: "section" },
    Icon: {},
  };
  const filename = path.resolve(__dirname, "../src/model-menu.tsx");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (id) => {
    if (id === "@raycast/api") return api;
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
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
  let props = {
    models: [
      model("A", ["low", "high"], "low"),
      model("B", ["minimal", "medium"], "medium"),
    ],
    selection: { model: "A", effort: "high" },
    current: { model: "A", effort: "low" },
    loading: false,
    ready: true,
    error: "",
    onRefresh: () => {
      refreshes++;
    },
    onSelect: (value) => selected.push(value),
    ...overrides,
  };
  function expand(node) {
    if (!node || typeof node !== "object") return [];
    if (typeof node.type === "function" && node.type !== Action)
      return expand(node.type(node.props));
    return [node, ...[node.props?.children].flat(Infinity).flatMap(expand)];
  }
  function raw(node) {
    if (!node || typeof node !== "object") return [];
    return [node, ...[node.props?.children].flat(Infinity).flatMap(raw)];
  }
  function render(kind) {
    active = references[kind];
    cursor = 0;
    const node = loaded.exports[kind](props);
    for (const hook of active) {
      if (hook?.pending) {
        hook.pending = false;
        hook.cleanup = hook.effect();
      }
    }
    return node;
  }
  return {
    render,
    nodes: (kind) => expand(render(kind)),
    choices: (kind) =>
      expand(render(kind))
        .filter((node) => node.type === "submenu")
        .slice(1)
        .map((node) => node.props),
    rawChoices: (kind) =>
      raw(render(kind)).filter((node) => node.type?.name === "SelectionChoice"),
    actions: (kind) =>
      expand(render(kind))
        .filter((node) => node.type === Action)
        .map((node) => node.props),
    sections: (kind) =>
      expand(render(kind))
        .filter((node) => node.type === "section")
        .map((node) => node.props),
    update(change) {
      props = { ...props, ...change };
    },
    unmount(kind) {
      for (const hook of references[kind]) hook?.cleanup?.();
    },
    replayEffects(kind) {
      for (const hook of references[kind]) {
        if (hook?.effect) {
          hook.cleanup?.();
          hook.cleanup = hook.effect();
        }
      }
    },
    selected,
    get refreshes() {
      return refreshes;
    },
  };
}

test("model and effort are independent menus and every open refreshes even a populated catalog", () => {
  const ui = menus();
  assert.equal(ui.render("ModelMenu").props.title, "Model: A");
  assert.equal(ui.render("EffortMenu").props.title, "Effort Level: high");
  assert.equal(ui.render("ModelMenu").props.shortcut.key, "m");
  assert.equal(ui.render("EffortMenu").props.shortcut.key, "e");
  for (const kind of ["ModelMenu", "EffortMenu"]) {
    ui.render(kind).props.onOpen();
    ui.render(kind).props.onOpen();
  }
  assert.equal(ui.refreshes, 4);
  ui.update({ loading: true });
  for (const kind of ["ModelMenu", "EffortMenu"])
    ui.render(kind).props.onOpen();
  assert.equal(ui.refreshes, 4);
  ui.update({ loading: false, ready: false });
  ui.render("ModelMenu").props.onOpen();
  assert.equal(ui.refreshes, 4);
  ui.update({ shortcuts: false });
  assert.equal(ui.render("EffortMenu").props.shortcut, undefined);
});

test("loading, failed and disconnected catalogs hide cached choices including current-model selection", () => {
  for (const [state, caption] of [
    [{ loading: true }, "Loading Models…"],
    [{ error: "CLI catalog failed" }, "Model List Unavailable"],
    [{ ready: false }, "Waiting for Connection"],
  ]) {
    const ui = menus(state);
    for (const kind of ["ModelMenu", "EffortMenu"]) {
      assert.ok(ui.render(kind).props.title.includes(caption));
      const choices = ui.actions(kind);
      assert.ok(
        choices.every((action) =>
          [
            "Loading Models…",
            "Reload Model List",
            "Waiting for Connection",
          ].includes(action.title),
        ),
      );
      assert.equal(
        choices.some(
          (action) => action.title === "Use Current Conversation Model",
        ),
        false,
      );
    }
    assert.deepEqual(ui.selected, []);
  }
});

test("an empty catalog gives an explicit status without invented model or effort options", () => {
  const ui = menus({ models: [] });
  for (const kind of ["ModelMenu", "EffortMenu"]) {
    assert.ok(ui.render(kind).props.title.includes("No Models Available"));
    assert.deepEqual(
      ui.actions(kind).map((action) => action.title),
      ["Refresh Model List"],
    );
    ui.render(kind).props.onOpen();
  }
  assert.equal(ui.refreshes, 2);
});

test("model changes derive effort only from the selected model's current real options", () => {
  for (const [entry, expected] of [
    [model("B", ["minimal", "medium"], "medium"), "medium"],
    [model("B", ["minimal", "medium"], "invalid"), "minimal"],
    [model("B", ["high", "medium"], "medium"), "high"],
    [model("B", [], "high"), ""],
  ]) {
    const ui = menus({ models: [entry] });
    ui.actions("ModelMenu")
      .find((action) => action.title === "B")
      .onAction();
    assert.deepEqual(ui.selected, [{ model: "B", effort: expected }]);
  }
});

test("nonadjustable models keep the independent effort menu and explain the limitation", () => {
  const ui = menus({ models: [model("A", [])] });
  assert.equal(
    ui.render("EffortMenu").props.title,
    "Effort Level: Not adjustable",
  );
  assert.ok(
    ui
      .sections("EffortMenu")
      .some(
        (section) =>
          section.title ===
          "This model does not expose an adjustable effort level.",
      ),
  );
  assert.deepEqual(
    ui.actions("EffortMenu").map((action) => action.title),
    ["Refresh Model List"],
  );
});

test("effort options come only from the current model and unknown future values retain their order", () => {
  const efforts = ["future-b", "high", "future-a", "low", "ultra"];
  const ui = menus({
    models: [model("A", efforts), model("B", ["unrelated"])],
    allowCurrent: false,
  });
  assert.deepEqual(
    ui.actions("EffortMenu").map((action) => action.title),
    ["low", "high", "ultra", "future-b", "future-a", "Refresh Model List"],
  );
  assert.deepEqual(efforts, ["future-b", "high", "future-a", "low", "ultra"]);
  ui.actions("EffortMenu")
    .find((action) => action.title === "future-a")
    .onAction();
  assert.deepEqual(ui.selected, [{ model: "A", effort: "future-a" }]);
  assert.equal(
    ui
      .actions("ModelMenu")
      .some((action) => action.title === "Use Current Conversation Model"),
    false,
  );
});

test("callbacks from an older menu cannot select during refresh failure or use removed catalog entries", () => {
  const ui = menus();
  const oldModel = ui
    .actions("ModelMenu")
    .find((action) => action.title === "B");
  const oldCurrent = ui
    .actions("ModelMenu")
    .find((action) => action.title === "Use Current Conversation Model");
  const oldEffort = ui
    .actions("EffortMenu")
    .find((action) => action.title === "high");
  ui.update({ loading: true });
  ui.render("ModelMenu");
  ui.render("EffortMenu");
  oldModel.onAction();
  oldCurrent.onAction();
  oldEffort.onAction();
  ui.update({ loading: false, error: "failed" });
  ui.render("ModelMenu");
  ui.render("EffortMenu");
  oldModel.onAction();
  oldCurrent.onAction();
  oldEffort.onAction();
  ui.update({ error: "", models: [model("A", ["low"])] });
  ui.render("ModelMenu");
  ui.render("EffortMenu");
  oldModel.onAction();
  oldEffort.onAction();
  assert.deepEqual(ui.selected, []);
});

test("refreshed models and changed current model rerender real choices and invalidate old effort callbacks", () => {
  const ui = menus();
  const oldEffort = ui
    .actions("EffortMenu")
    .find((action) => action.title === "high");
  ui.update({
    models: [model("C", ["medium"])],
    selection: { model: "C", effort: "medium" },
  });
  const modelChoices = ui.actions("ModelMenu").map((action) => action.title);
  assert.ok(modelChoices.includes("C"));
  assert.ok(!modelChoices.includes("A"));
  assert.deepEqual(
    ui.actions("EffortMenu").map((action) => action.title),
    ["medium", "Refresh Model List"],
  );
  oldEffort.onAction();
  assert.deepEqual(ui.selected, []);
  ui.actions("EffortMenu")
    .find((action) => action.title === "medium")
    .onAction();
  assert.deepEqual(ui.selected, [{ model: "C", effort: "medium" }]);
});

function sharedInput() {
  let opens = 0,
    renders = 0,
    draft = "existing draft";
  return {
    ref: {
      current: {
        title: "Enter Message",
        open() {
          opens++;
        },
        onSearchTextChange(text) {
          draft = text;
        },
        content() {
          renders++;
          return { type: "continued-input", props: { draft } };
        },
      },
    },
    get opens() {
      return opens;
    },
    get renders() {
      return renders;
    },
    get draft() {
      return draft;
    },
  };
}

for (const [kind, title, expected, inactive] of [
  ["ModelMenu", "B", { model: "B", effort: "medium" }, "A"],
  ["EffortMenu", "low", { model: "A", effort: "low" }, "high"],
]) {
  test(`${kind} applies a choice and lazily opens the shared message input`, () => {
    const input = sharedInput();
    const ui = menus({ inputRef: input.ref });
    assert.equal(
      ui.nodes(kind).some((node) => node.type === "continued-input"),
      false,
    );
    assert.equal(input.renders, 0);
    const choice = ui.choices(kind).find((entry) => entry.title === title);
    assert.equal(choice.filtering, false);
    assert.equal(choice.onAction, undefined);
    choice.onOpen();
    assert.deepEqual(ui.selected, [expected]);
    assert.equal(input.opens, 1);
    const active = ui
      .choices(kind)
      .find((entry) => entry.title === "Enter Message");
    assert.ok(active);
    assert.ok(ui.nodes(kind).some((node) => node.type === "continued-input"));
    active.onSearchTextChange("continued text  ");
    assert.equal(input.draft, "continued text  ");
    assert.deepEqual(ui.selected, [expected]);
  });

  test(`${kind} keeps its active input branch through refresh and model removal while hiding old choices`, () => {
    const input = sharedInput();
    const ui = menus({ inputRef: input.ref });
    const oldInactive = ui
      .choices(kind)
      .find((entry) => entry.title === inactive);
    ui.choices(kind)
      .find((entry) => entry.title === title)
      .onOpen();
    const original = ui.rawChoices(kind).find((node) => node.props.active);
    for (const state of [
      { models: [], loading: true },
      { loading: false, error: "refresh failed" },
      {
        error: "",
        models: [model("C", ["medium"])],
        selection: { model: "C", effort: "medium" },
      },
    ]) {
      ui.update(state);
      const active = ui.rawChoices(kind).find((node) => node.props.active);
      assert.equal(active.key, original.key);
      assert.equal(active.type, original.type);
      assert.ok(ui.nodes(kind).some((node) => node.type === "continued-input"));
      assert.equal(
        ui.choices(kind).some((entry) => entry.title === inactive),
        false,
      );
      oldInactive.onOpen();
      assert.equal(input.opens, 1);
      assert.deepEqual(ui.selected, [expected]);
    }
    const before = input.renders;
    ui.render(kind).props.onOpen();
    assert.equal(
      ui.nodes(kind).some((node) => node.type === "continued-input"),
      false,
    );
    assert.equal(input.renders, before);
    assert.equal(
      ui.rawChoices(kind).some((node) => node.props.active),
      false,
    );
    assert.deepEqual(ui.selected, [expected]);
  });

  test(`${kind} does not enter message input after a rejected or stale selection`, () => {
    const input = sharedInput();
    const ui = menus({ inputRef: input.ref, onSelect: () => false });
    const choice = ui.choices(kind).find((entry) => entry.title === title);
    choice.onOpen();
    choice.onSearchTextChange("must not replace draft");
    assert.equal(input.opens, 0);
    assert.equal(input.draft, "existing draft");
    assert.equal(
      ui.nodes(kind).some((node) => node.type === "continued-input"),
      false,
    );
    ui.update({ loading: true, models: [] });
    ui.render(kind);
    choice.onOpen();
    assert.equal(input.opens, 0);
    assert.equal(input.renders, 0);
  });

  test(`${kind} reopening immediately retires active and inactive callbacks before rerender`, () => {
    const input = sharedInput();
    const ui = menus({ inputRef: input.ref });
    const oldInactive = ui
      .choices(kind)
      .find((entry) => entry.title === inactive);
    ui.choices(kind)
      .find((entry) => entry.title === title)
      .onOpen();
    const oldActive = ui
      .choices(kind)
      .find((entry) => entry.title === "Enter Message");
    const before = { opens: input.opens, selected: [...ui.selected] };
    ui.render(kind).props.onOpen();
    input.ref.current.onSearchTextChange("new current draft");
    // Native callbacks can arrive before React removes the retired children.
    oldActive.onSearchTextChange("late retired text");
    oldActive.onSearchTextChange("");
    oldActive.onOpen();
    oldInactive.onOpen();
    assert.equal(input.draft, "new current draft");
    assert.equal(input.opens, before.opens);
    assert.deepEqual(ui.selected, before.selected);
    assert.equal(
      ui.rawChoices(kind).some((node) => node.props.active),
      false,
    );
    ui.choices(kind)
      .find((entry) => entry.title === title)
      .onOpen();
    const current = ui
      .choices(kind)
      .find((entry) => entry.title === "Enter Message");
    current.onSearchTextChange("live draft");
    assert.equal(input.draft, "live draft");
    assert.equal(input.opens, before.opens + 1);
  });

  test(`${kind} reactivating the same key uses a new branch token`, () => {
    const input = sharedInput();
    const ui = menus({ inputRef: input.ref });
    const choice = ui.choices(kind).find((entry) => entry.title === title);
    choice.onOpen();
    const first = ui
      .choices(kind)
      .find((entry) => entry.title === "Enter Message");
    // React has not changed the menu epoch; the same option opens again.
    choice.onOpen();
    const second = ui
      .choices(kind)
      .find((entry) => entry.title === "Enter Message");
    second.onSearchTextChange("second activation draft");
    const opens = input.opens;
    first.onSearchTextChange("old activation must not win");
    first.onOpen();
    assert.equal(input.draft, "second activation draft");
    assert.equal(input.opens, opens);
    second.onSearchTextChange("current activation still works");
    assert.equal(input.draft, "current activation still works");
  });

  test(`${kind} unmount prevents late callbacks reaching a replacement composer`, () => {
    const input = sharedInput();
    const ui = menus({ inputRef: input.ref });
    const oldInactive = ui
      .choices(kind)
      .find((entry) => entry.title === inactive);
    ui.choices(kind)
      .find((entry) => entry.title === title)
      .onOpen();
    const oldActive = ui
      .choices(kind)
      .find((entry) => entry.title === "Enter Message");
    const oldParent = ui.render(kind).props;
    const selected = [...ui.selected];
    const refreshes = ui.refreshes;
    ui.unmount(kind);
    const replacement = sharedInput();
    input.ref.current = replacement.ref.current;
    replacement.ref.current.onSearchTextChange("replacement composer draft");
    oldActive.onSearchTextChange("retired composer text");
    oldActive.onOpen();
    oldInactive.onOpen();
    oldParent.onOpen();
    assert.equal(replacement.draft, "replacement composer draft");
    assert.equal(replacement.opens, 0);
    assert.deepEqual(ui.selected, selected);
    assert.equal(ui.refreshes, refreshes);
  });

  test(`${kind} effect replay retires old callbacks and permits fresh choices`, () => {
    const input = sharedInput();
    const ui = menus({ inputRef: input.ref });
    const oldChoice = ui.choices(kind).find((entry) => entry.title === title);
    ui.replayEffects(kind);
    oldChoice.onOpen();
    assert.equal(input.opens, 0);
    ui.choices(kind)
      .find((entry) => entry.title === title)
      .onOpen();
    assert.equal(input.opens, 1);
    const current = ui
      .choices(kind)
      .find((entry) => entry.title === "Enter Message");
    current.onSearchTextChange("fresh after effect replay");
    assert.equal(input.draft, "fresh after effect replay");
  });
}

test("model-choice opening without a mounted composer neither applies a selection nor constructs input", () => {
  const ui = menus({ inputRef: { current: null } });
  ui.choices("ModelMenu")
    .find((entry) => entry.title === "B")
    .onOpen();
  assert.deepEqual(ui.selected, []);
  assert.equal(
    ui.nodes("ModelMenu").some((node) => node.type === "continued-input"),
    false,
  );
});
