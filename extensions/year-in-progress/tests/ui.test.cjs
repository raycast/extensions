const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const { createLoader, createMemoryStorage, sourceRoot } = require("./helpers.cjs");

const jsx = (type, props, key) => ({ type, props: props || {}, key });
const component = (name, children = {}) => Object.assign(() => {}, children, { displayName: name });
const Action = component("Action", {
  CopyToClipboard: "CopyToClipboard",
  SubmitForm: "SubmitForm",
  Style: { Destructive: "destructive" },
});
const ActionPanel = component("ActionPanel", { Section: "ActionPanel.Section" });
const List = component("List", {
  Item: component("List.Item", { Detail: {} }),
  Section: "List.Section",
  EmptyView: "EmptyView",
  Dropdown: component("List.Dropdown", { Item: "Dropdown.Item", Section: "Dropdown.Section" }),
});
const Form = component("Form", {
  TextField: "TextField",
  DatePicker: "DatePicker",
  Checkbox: "Checkbox",
});
const MenuBarExtra = component("MenuBarExtra", { Item: "MenuBarExtra.Item", Section: "MenuBarExtra.Section" });
const LaunchType = { Background: "background", UserInitiated: "user" };

function nodes(root) {
  if (!root || typeof root !== "object") return [];
  if (Array.isArray(root)) return root.flatMap(nodes);
  return [root, ...Object.values(root.props || {}).flatMap(nodes)];
}

function find(root, predicate) {
  const match = nodes(root).find(predicate);
  assert.ok(match, "Expected UI element");
  return match;
}

function action(root, title) {
  return find(root, (node) => node.props?.title === title && typeof node.props.onAction === "function");
}

function stateHooks() {
  const values = [];
  let cursor = 0;
  return {
    reset() {
      cursor = 0;
    },
    values,
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in values)) values[index] = typeof initial === "function" ? initial() : initial;
        return [
          values[index],
          (update) => {
            values[index] = typeof update === "function" ? update(values[index]) : update;
          },
        ];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in values)) values[index] = { current: initial };
        return values[index];
      },
      useCallback: (callback) => callback,
      useEffect: () => {},
    },
  };
}

function progress(id = "custom:existing", type = "user") {
  return {
    id,
    type,
    title: type === "user" ? "Project" : "Year In Progress",
    pinned: false,
    startDate: new Date(2026, 0, 1).getTime(),
    endDate: new Date(2027, 0, 1).getTime(),
    progressNum: 50,
    menubar: { shown: true, title: type === "user" ? "Project" : "Year" },
    showAsCommand: true,
  };
}

function harness(options = {}) {
  const events = [];
  const toasts = [];
  const effects = [];
  const metadata = [];
  const pushed = [];
  const hooks = stateHooks();
  hooks.react.useEffect = (effect) => effects.push(effect);
  const items = options.items || [progress("default:year", "default"), progress()];
  const state = {
    allProgress: items,
    commandProgressId: "custom:existing",
    currMenubarProgressId: "custom:existing",
    storageWarnings: [],
    isLoading: false,
  };
  let pops = 0;
  const store = {
    readProgress: async () => state,
    saveCustomProgress: async (id, values, original) => {
      events.push(["save", id, values, original]);
      if (options.save) await options.save();
    },
    deleteCustomProgress: async (id) => events.push(["delete", id]),
    setPinned: async (id, value) => events.push(["pin", id, value]),
    setMenuBarVisible: async (id, value) => events.push(["visible", id, value]),
    selectCommand: async (id) => events.push(["select", id]),
    selectMenuBar: async (id) => events.push(["menu", id]),
  };
  const api = {
    LocalStorage: options.storage,
    Action,
    ActionPanel,
    List,
    Form,
    MenuBarExtra,
    Icon: {},
    Keyboard: {
      Shortcut: {
        Common: { New: { macOS: { modifiers: ["cmd"], key: "n" }, Windows: { modifiers: ["ctrl"], key: "n" } } },
      },
    },
    LaunchType,
    environment: { launchType: LaunchType.Background },
    Toast: { Style: { Success: "success", Failure: "failure" } },
    getPreferenceValues: () => ({ weekStartsOn: "1" }),
    confirmAlert: async () => true,
    showToast: async (toast) => {
      toasts.push(toast);
      events.push(["toast", toast]);
    },
    updateCommandMetadata: async (value) => {
      metadata.push(value);
      if (options.updateMetadata) await options.updateMetadata(value);
    },
    launchCommand: async (launch) => {
      events.push(["launch", launch.name]);
      if (options.disabled) throw new Error("Command is disabled");
    },
    useNavigation: () => ({
      push: (element) => pushed.push(element),
      pop: () => {
        pops++;
        events.push(["pop"]);
      },
    }),
  };
  const load = createLoader({
    api,
    platform: options.platform || "win32",
    react: hooks.react,
    modules: {
      "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
      "node:crypto": { randomUUID: () => "created" },
      [path.join(sourceRoot, "utils/icon.ts")]: { getIcon: () => ({}) },
      ...(options.realStore ? {} : { [path.join(sourceRoot, "utils/progress-store.ts")]: store }),
      [path.join(sourceRoot, "hooks/use-local-storage-progress.ts")]: {
        useLocalStorageProgress: () => ({
          state,
          reload: async () => {
            events.push(["reload"]);
            if (options.reloadFails) throw new Error("Read failed");
            if (options.realStore) {
              Object.assign(state, await load("utils/progress-store.ts").readProgress());
            }
            return state;
          },
        }),
      },
    },
  });
  return { events, toasts, effects, metadata, pushed, hooks, state, store, api, load, pops: () => pops };
}

function commandPicker(tree) {
  return find(tree, (node) => node.type === List.Dropdown);
}

test("command progress picker lists every calendar period and custom range with stable IDs", () => {
  const ui = harness();
  ui.state.allProgress = [...ui.load("utils/progress.ts").getDefaultProgress(), progress()];
  const tree = ui.load("x-in-progress.tsx").default();
  const picker = commandPicker(tree);
  assert.equal(picker.props.value, "custom:existing");
  assert.equal(picker.props.storeValue, false);
  assert.deepEqual(
    nodes(picker)
      .filter((node) => node.type === "Dropdown.Item")
      .map((node) => [node.props.value, node.props.title]),
    [
      ["default:year", "Year"],
      ["default:quarter", "Quarter"],
      ["default:month", "Month"],
      ["default:week", "Week"],
      ["default:day", "Day"],
      ["custom:existing", "Project"],
    ]
  );
  assert.equal(nodes(tree).filter((node) => node.type === List.Item).length, 6);
});

test("command progress picker saves Quarter, updates the subtitle, and retains the choice on reopening", async () => {
  const storage = createMemoryStorage();
  const ui = harness({ storage: storage.api, realStore: true });
  Object.assign(ui.state, await ui.load("utils/progress-store.ts").readProgress());
  const View = ui.load("x-in-progress.tsx").default;
  const tree = View();
  assert.equal(commandPicker(tree).props.value, "default:year");
  await commandPicker(tree).props.onChange("default:quarter");
  assert.equal(storage.values["progress:v2:commandSelection"], "default:quarter");
  assert.equal(ui.state.commandProgressId, "default:quarter");
  ui.effects.splice(0);
  ui.hooks.reset();
  const updated = View();
  ui.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.equal(commandPicker(updated).props.value, "default:quarter");
  assert.match(ui.metadata.at(-1).subtitle, /^Quarter [■□]{10} \d+%$/);
  const reopened = harness({ storage: storage.api, realStore: true });
  Object.assign(reopened.state, await reopened.load("utils/progress-store.ts").readProgress());
  assert.equal(commandPicker(reopened.load("x-in-progress.tsx").default()).props.value, "default:quarter");
});

test("command progress picker ignores unchanged and unknown values and waits for hydration", async () => {
  const ui = harness();
  const View = ui.load("x-in-progress.tsx").default;
  const picker = commandPicker(View());
  await picker.props.onChange(ui.state.commandProgressId);
  await picker.props.onChange("default:unknown");
  assert.equal(ui.events.length, 0);
  ui.state.isLoading = true;
  ui.hooks.reset();
  assert.equal(
    nodes(View()).some((node) => node.type === List.Dropdown),
    false
  );
});

test("command progress picker reloads the prior selection when its write fails", async () => {
  const storage = createMemoryStorage();
  storage.api.setItem = async () => {
    throw new Error("Selection write failed");
  };
  const ui = harness({ storage: storage.api, realStore: true });
  Object.assign(ui.state, await ui.load("utils/progress-store.ts").readProgress());
  const View = ui.load("x-in-progress.tsx").default;
  await commandPicker(View()).props.onChange("default:week");
  assert.equal(ui.state.commandProgressId, "default:year");
  ui.hooks.reset();
  assert.equal(commandPicker(View()).props.value, "default:year");
  assert.match(ui.toasts.at(-1).message, /Selection write failed/);
  assert.equal(
    ui.events.some(([event]) => event === "launch"),
    false
  );
});

test("normal view command publishes its selected progress in root search", async () => {
  const ui = harness();
  ui.load("x-in-progress.tsx").default();
  ui.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.deepEqual(
    ui.metadata.map((value) => value.subtitle),
    ["Project ■■■■■□□□□□ 50%"]
  );
});

test("normal view selection updates its subtitle after saving and falls back to Year on deletion", async () => {
  const item = progress();
  const storage = createMemoryStorage({
    "progress:v2:custom:custom:existing": JSON.stringify({
      title: item.title,
      menubarTitle: item.menubar.title,
      startDate: item.startDate,
      endDate: item.endDate,
      initialMenuBarVisible: false,
    }),
  });
  const ui = harness({ storage: storage.api, realStore: true });
  Object.assign(ui.state, await ui.load("utils/progress-store.ts").readProgress());
  const View = ui.load("x-in-progress.tsx").default;
  let cleanup;
  const render = async () => {
    cleanup?.();
    ui.hooks.reset();
    const tree = View();
    cleanup = ui.effects.splice(0).at(-1)?.();
    await new Promise(setImmediate);
    return tree;
  };
  let tree = await render();
  const yearSubtitle = ui.metadata.at(-1).subtitle;
  assert.match(yearSubtitle, /^Year [■□]{10} \d+%$/);
  const custom = find(tree, (node) => node.props?.id === item.id);
  await action(custom, "Show in Command Subtitle").props.onAction();
  assert.equal(storage.values["progress:v2:commandSelection"], item.id);
  assert.equal(ui.metadata.at(-1).subtitle, yearSubtitle);
  tree = await render();
  const projectSubtitle = ui.metadata.at(-1).subtitle;
  assert.match(projectSubtitle, /^Project [■□]{10} \d+%$/);
  await ui.load("year-in-progress.tsx").default();
  assert.equal(ui.metadata.at(-1).subtitle, projectSubtitle);
  await action(
    find(tree, (node) => node.props?.id === item.id),
    "Delete Progress"
  ).props.onAction();
  await render();
  assert.equal(ui.metadata.at(-1).subtitle, yearSubtitle);
  cleanup?.();
});

test("loading or unavailable progress leaves the existing normal-command metadata intact", async () => {
  for (const loading of [true, false]) {
    const ui = harness({ items: [] });
    ui.state.isLoading = loading;
    ui.load("x-in-progress.tsx").default();
    ui.effects.forEach((effect) => effect());
    await new Promise(setImmediate);
    assert.equal(ui.metadata.length, 0);
  }
});

test("normal-command metadata failure is reported without changing saved selection", async () => {
  const ui = harness({
    updateMetadata: async () => {
      throw new Error("Metadata unavailable");
    },
  });
  ui.load("x-in-progress.tsx").default();
  ui.effects.forEach((effect) => effect());
  await new Promise(setImmediate);
  assert.equal(ui.state.commandProgressId, "custom:existing");
  assert.equal(
    ui.events.some(([event]) => event === "save" || event === "select"),
    false
  );
  assert.match(ui.toasts.at(-1).title, /Subtitle/);
  assert.match(ui.toasts.at(-1).message, /Metadata unavailable/);
});

test("normal-command metadata writes keep the newest selection after a delayed older update", async () => {
  let finish;
  const ui = harness({
    updateMetadata: (value) =>
      value.subtitle.startsWith("Project")
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : Promise.resolve(),
  });
  const View = ui.load("x-in-progress.tsx").default;
  View();
  const cleanup = ui.effects.splice(0)[0]();
  await new Promise(setImmediate);
  assert.equal(ui.metadata.length, 1);
  cleanup();
  ui.state.commandProgressId = "default:year";
  ui.hooks.reset();
  View();
  ui.effects.splice(0)[0]();
  await new Promise(setImmediate);
  assert.equal(ui.metadata.length, 1);
  finish();
  await new Promise(setImmediate);
  assert.deepEqual(
    ui.metadata.map((value) => value.subtitle),
    ["Project ■■■■■□□□□□ 50%", "Year ■■■■■□□□□□ 50%"]
  );
});

const validValues = {
  title: "New Project",
  menubarTitle: "New",
  startDate: new Date(2026, 0, 1),
  endDate: new Date(2027, 0, 1),
  showInMenubar: false,
  showAsCommand: true,
};

test("create waits for persistence before reload, refresh, and closing the form", async () => {
  let resolveSave;
  const ui = harness({
    save: () =>
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
  });
  const tree = ui.load("x-in-progress.tsx").default();
  action(tree, "Add New Progress").props.onAction();
  const form = ui.pushed[0];
  const pending = form.props.onSubmit(validValues);
  assert.deepEqual(
    ui.events.map(([event]) => event),
    ["save"]
  );
  assert.equal(ui.pops(), 0);
  resolveSave();
  await pending;
  assert.deepEqual(
    ui.events.map(([event]) => event),
    ["save", "reload", "launch", "pop", "toast"]
  );
  assert.equal(ui.events[0][1], "custom:created");
});

test("a failed save keeps the form open and retries with the same custom ID", async () => {
  let fail = true;
  const ui = harness({
    save: async () => {
      if (fail) throw new Error("Disk full");
    },
  });
  action(ui.load("x-in-progress.tsx").default(), "Add New Progress").props.onAction();
  const form = ui.pushed[0];
  await form.props.onSubmit(validValues);
  assert.equal(ui.pops(), 0);
  assert.equal(
    ui.events.some(([event]) => event === "launch"),
    false
  );
  assert.match(ui.toasts[0].message, /Disk full/);
  fail = false;
  await form.props.onSubmit(validValues);
  const saves = ui.events.filter(([event]) => event === "save");
  assert.equal(saves.length, 2);
  assert.equal(saves[0][1], saves[1][1]);
  assert.equal(ui.pops(), 1);
});

test("a disabled refresh command reports committed progress and closes the form", async () => {
  const ui = harness({ disabled: true });
  action(ui.load("x-in-progress.tsx").default(), "Add New Progress").props.onAction();
  await ui.pushed[0].props.onSubmit(validValues);
  assert.equal(ui.events.filter(([event]) => event === "save").length, 1);
  assert.equal(ui.pops(), 1);
  assert.equal(ui.toasts.at(-1).title, "Progress Added");
  assert.match(ui.toasts.at(-1).message, /Saved, but Progress could not refresh/);
});

test("defaults have no delete or edit action, while custom mutations use stable IDs", async () => {
  const ui = harness();
  const tree = ui.load("x-in-progress.tsx").default();
  const year = find(tree, (node) => node.props?.id === "default:year");
  assert.equal(
    nodes(year).some((node) => node.props?.title === "Delete Progress"),
    false
  );
  assert.equal(
    nodes(year).some((node) => node.props?.title === "Edit Progress"),
    false
  );
  const custom = find(tree, (node) => node.props?.id === "custom:existing");
  await action(custom, "Delete Progress").props.onAction();
  assert.deepEqual(ui.events[0], ["delete", "custom:existing"]);
});

test("edit passes the original record so untouched hidden Windows flags survive", async () => {
  const ui = harness();
  const tree = ui.load("x-in-progress.tsx").default();
  const custom = find(tree, (node) => node.props?.id === "custom:existing");
  action(custom, "Edit Progress").props.onAction();
  const formNode = ui.pushed[0];
  const FormComponent = formNode.type;
  ui.hooks.values.length = 0;
  const render = () => {
    ui.hooks.reset();
    return FormComponent(formNode.props);
  };
  const form = render();
  assert.equal(
    nodes(form).some((node) => node.props?.id === "showInMenubar"),
    false
  );
  const submit = find(form, (node) => node.type === "SubmitForm");
  await submit.props.onSubmit({
    title: "Renamed Project",
    menubarTitle: "Project",
    startDate: validValues.startDate,
    endDate: validValues.endDate,
    showAsCommand: false,
  });
  const saved = ui.events.find(([event]) => event === "save");
  assert.equal(saved[1], "custom:existing");
  assert.equal(saved[2].showInMenubar, true);
  assert.equal(saved[3], ui.state.allProgress[1]);
});

test("form rejects invalid submission even without change or blur, and preserves a cleared date", async () => {
  const ui = harness();
  let submissions = 0;
  const FormComponent = ui.load("components/add-or-edit-progress.tsx").default;
  const props = {
    allProgress: [],
    onSubmit: async () => {
      submissions++;
    },
  };
  const render = () => {
    ui.hooks.reset();
    return FormComponent(props);
  };
  let form = render();
  await find(form, (node) => node.type === "SubmitForm").props.onSubmit({ ...validValues, title: "   " });
  assert.equal(submissions, 0);
  form = render();
  assert.ok(find(form, (node) => node.props?.id === "title").props.error);
  find(form, (node) => node.props?.id === "startDate").props.onChange(null);
  form = render();
  assert.equal(find(form, (node) => node.props?.id === "startDate").props.value, null);
  await find(form, (node) => node.type === "SubmitForm").props.onSubmit({});
  assert.equal(submissions, 0);
  form = render();
  find(form, (node) => node.props?.id === "startDate").props.onChange(validValues.startDate);
  form = render();
  await find(form, (node) => node.type === "SubmitForm").props.onSubmit(validValues);
  assert.equal(submissions, 1);
});

test("empty view supplies a working add action", () => {
  const ui = harness({ items: [] });
  const tree = ui.load("x-in-progress.tsx").default();
  const empty = find(tree, (node) => node.type === "EmptyView");
  action(empty, "Add New Progress").props.onAction();
  assert.equal(ui.pushed.length, 1);
  assert.equal(ui.pushed[0].props.allProgress.length, 0);
});

test("menu-bar selection saves then reloads without launching its own command", async () => {
  const ui = harness({ platform: "darwin" });
  const tree = ui.load("index.tsx").default();
  await action(tree, "Year").props.onAction();
  assert.deepEqual(ui.events, [["menu", "default:year"], ["reload"]]);
});

test("read-only progress hook polls every minute and cleans up its timer", async () => {
  const hooks = stateHooks();
  const effects = [];
  const timers = [];
  let cleared;
  let reads = 0;
  const snapshot = {
    allProgress: [progress()],
    commandProgressId: "custom:existing",
    currMenubarProgressId: null,
    storageWarnings: [],
  };
  hooks.react.useEffect = (effect) => effects.push(effect);
  const load = createLoader({
    api: { Toast: { Style: { Failure: "failure" } }, showToast: async () => {} },
    react: hooks.react,
    globals: {
      setInterval: (callback, duration) => {
        timers.push({ callback, duration });
        return 7;
      },
      clearInterval: (id) => {
        cleared = id;
      },
    },
    modules: {
      [path.join(sourceRoot, "utils/progress-store.ts")]: {
        readProgress: async () => {
          reads++;
          return snapshot;
        },
      },
    },
  });
  const hook = load("hooks/use-local-storage-progress.ts").useLocalStorageProgress();
  assert.equal(hook.state.isLoading, true);
  const cleanup = effects[0]();
  await new Promise(setImmediate);
  assert.equal(reads, 1);
  assert.equal(timers[0].duration, 60_000);
  timers[0].callback();
  await new Promise(setImmediate);
  assert.equal(reads, 2);
  assert.equal(hooks.values.find((value) => value?.allProgress)?.isLoading, false);
  cleanup();
  assert.equal(cleared, 7);
});

test("form blocks a second submit before React rerenders and keeps the first save loading", async () => {
  const ui = harness();
  let submissions = 0;
  let finish;
  const FormComponent = ui.load("components/add-or-edit-progress.tsx").default;
  const form = FormComponent({
    allProgress: [],
    onSubmit: () => {
      submissions++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  const submit = find(form, (node) => node.type === "SubmitForm").props.onSubmit;
  const pending = submit(validValues);
  await submit(validValues);
  assert.equal(submissions, 1);
  assert.equal(ui.hooks.values[2], true);
  finish();
  await pending;
  assert.equal(ui.hooks.values[2], false);
});

test("a partial save failure reloads the list and reports possible saved changes without refreshing", async () => {
  let definitionSaved = false;
  const ui = harness({
    save: async () => {
      definitionSaved = true;
      throw new Error("Could not save command selection");
    },
  });
  action(ui.load("x-in-progress.tsx").default(), "Add New Progress").props.onAction();
  await ui.pushed[0].props.onSubmit(validValues);
  assert.equal(definitionSaved, true);
  assert.equal(ui.pops(), 0);
  assert.deepEqual(
    ui.events.map(([event]) => event),
    ["save", "reload", "toast"]
  );
  assert.match(ui.toasts[0].message, /Some changes may have been saved/);
});

test("retrying a partially saved edit rebases visibility against the actual saved record", async () => {
  const item = progress();
  item.menubar.shown = false;
  const storage = createMemoryStorage({
    "progress:v2:custom:custom:existing": JSON.stringify({
      title: item.title,
      menubarTitle: item.menubar.title,
      startDate: item.startDate,
      endDate: item.endDate,
      initialMenuBarVisible: false,
    }),
    "progress:v2:commandSelection": item.id,
  });
  const write = storage.api.setItem;
  let failSelection = true;
  storage.api.setItem = async (key, value) => {
    if (key === "progress:v2:commandSelection" && failSelection) throw new Error("Selection write failed");
    await write(key, value);
  };
  const ui = harness({
    platform: "darwin",
    items: [progress("default:year", "default"), item],
    storage: storage.api,
    realStore: true,
  });
  const tree = ui.load("x-in-progress.tsx").default();
  const custom = find(tree, (node) => node.props?.id === item.id);
  action(custom, "Edit Progress").props.onAction();
  const submit = ui.pushed[0].props.onSubmit;
  const values = { ...validValues, title: item.title, showAsCommand: false, showInMenubar: true };
  await submit(values);
  assert.equal(storage.values["progress:v2:visible:custom:existing"], true);
  assert.equal(ui.pops(), 0);
  failSelection = false;
  await submit({ ...values, showInMenubar: false });
  const saved = await ui.load("utils/progress-store.ts").readProgress();
  assert.equal(saved.allProgress.find((record) => record.id === item.id).menubar.shown, false);
  assert.equal(saved.commandProgressId, "default:year");
  assert.equal(ui.pops(), 1);
});

test("retrying a partially saved creation edits its stable saved ID and applies changed visibility", async () => {
  const storage = createMemoryStorage();
  const write = storage.api.setItem;
  let failSelection = true;
  storage.api.setItem = async (key, value) => {
    if (key === "progress:v2:commandSelection" && failSelection) throw new Error("Selection write failed");
    await write(key, value);
  };
  const ui = harness({ platform: "darwin", storage: storage.api, realStore: true });
  action(ui.load("x-in-progress.tsx").default(), "Add New Progress").props.onAction();
  const submit = ui.pushed[0].props.onSubmit;
  await submit({ ...validValues, showInMenubar: true });
  assert.equal(ui.pops(), 0);
  failSelection = false;
  await submit({ ...validValues, showInMenubar: false });
  const saved = await ui.load("utils/progress-store.ts").readProgress();
  const created = saved.allProgress.filter((record) => record.type === "user");
  assert.equal(created.length, 1);
  assert.equal(created[0].id, "custom:created");
  assert.equal(created[0].menubar.shown, false);
  assert.equal(saved.commandProgressId, "custom:created");
  assert.equal(ui.pops(), 1);
});
