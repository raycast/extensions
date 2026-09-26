const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const load = require("./load-source.cjs");
const storage = load("src/storage.ts");
const { searchTodos, summarizeTodos } = load("src/queries.ts");
const { shortcut } = load("src/shortcuts.ts");
const { getTags } = load("src/tags.ts");
const item = (title, extra = {}) => ({ title, completed: false, timeAdded: 123, ...extra });
const sections = (todo = []) => ({ pinned: [], todo, completed: [] });
function fixture(t) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "todo-list-test-"));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  return { folder, file: path.join(folder, "todo.json") };
}

test("missing storage is an empty list without creating or modifying files", (t) => {
  const { folder, file } = fixture(t);
  assert.deepEqual(storage.readTodos(file), { sections: sections(), revision: null });
  assert.deepEqual(fs.readdirSync(folder), []);
});

test("legacy array format preserves completed pinned tasks and task metadata", () => {
  const pinned = item("Pinned", { completed: true, priority: 3, tag: "All", dueDate: 123 });
  const open = item("Open");
  const done = item("Done", { completed: true });
  const parsed = storage.parseTodos(JSON.stringify([[pinned], [done, open]]));
  assert.equal(parsed.pinned[0].completed, true);
  assert.equal(parsed.pinned[0].tag, "All");
  assert.equal(parsed.pinned[0].priority, 3);
  assert.equal(parsed.pinned[0].dueDate, 123);
  assert.equal(parsed.todo[0].title, "Open");
  assert.equal(parsed.completed[0].title, "Done");
});

test("corrupt, malformed, and unreadable files never become an empty list", (t) => {
  const { folder, file } = fixture(t);
  for (const content of ["{", "null", "{}", "[[],null]", JSON.stringify(sections([{ title: "Broken" }])), JSON.stringify(sections([item("Bad date", { dueDate: 9e20 })]))]) {
    fs.writeFileSync(file, content);
    assert.throws(() => storage.readTodos(file), /Could not read/);
    assert.equal(fs.readFileSync(file, "utf8"), content);
  }
  assert.throws(() => storage.readTodos(folder));
});

test("successful saves keep the previous file as a backup and leave no temporary files", (t) => {
  const { folder, file } = fixture(t);
  const previous = JSON.stringify(sections([item("Original")]));
  fs.writeFileSync(file, previous);
  const revision = storage.writeTodos(file, sections([item("Edited")]), previous);
  assert.equal(fs.readFileSync(file, "utf8"), revision);
  assert.equal(fs.readFileSync(`${file}.backup`, "utf8"), previous);
  assert.deepEqual(fs.readdirSync(folder).sort(), ["todo.json", "todo.json.backup"]);
});

test("a stale command cannot overwrite a newer list or its backup", (t) => {
  const { file } = fixture(t);
  const original = storage.writeTodos(file, sections([item("Original")]), null);
  const updated = storage.writeTodos(file, sections([item("Newer")]), original);
  assert.throws(() => storage.writeTodos(file, sections(), original), /changed in another command/);
  assert.equal(fs.readFileSync(file, "utf8"), updated);
  assert.equal(fs.readFileSync(`${file}.backup`, "utf8"), original);
});

test("invalid writes preserve the current file", (t) => {
  const { file } = fixture(t);
  const previous = storage.writeTodos(file, sections([item("Keep")]), null);
  assert.throws(() => storage.writeTodos(file, sections([item("Bad", { priority: 4 })]), previous));
  assert.equal(fs.readFileSync(file, "utf8"), previous);
});

test("backup failure prevents replacing the original list", (t) => {
  const { file } = fixture(t);
  const previous = storage.writeTodos(file, sections([item("Keep")]), null);
  fs.mkdirSync(`${file}.backup`);
  assert.throws(() => storage.writeTodos(file, sections(), previous));
  assert.equal(fs.readFileSync(file, "utf8"), previous);
});

test("import recovers from corrupt storage while preserving the original bytes", (t) => {
  const { folder, file } = fixture(t);
  fs.writeFileSync(file, "broken original");
  storage.importTodos(file, JSON.stringify([[], [item("Recovered")]]));
  assert.equal(storage.readTodos(file).sections.todo[0].title, "Recovered");
  const backup = fs.readdirSync(folder).find((name) => name.endsWith(".backup"));
  assert.equal(fs.readFileSync(path.join(folder, backup), "utf8"), "broken original");
});

test("invalid imports do not touch the current list", (t) => {
  const { folder, file } = fixture(t);
  fs.writeFileSync(file, "preserve even invalid bytes");
  assert.throws(() => storage.importTodos(file, "[]"));
  assert.equal(fs.readFileSync(file, "utf8"), "preserve even invalid bytes");
  assert.deepEqual(fs.readdirSync(folder), ["todo.json"]);
});

test("export and import round-trip without overwriting existing export files", (t) => {
  const { folder, file } = fixture(t);
  storage.writeTodos(file, { pinned: [item("Pin", { completed: true })], todo: [item("Work", { tag: "All", dueDate: 456, priority: 2 })], completed: [item("Done", { completed: true })] }, null);
  const destination = path.join(folder, "export.json");
  storage.exportTodos(file, destination);
  const exported = fs.readFileSync(destination, "utf8");
  assert.throws(() => storage.exportTodos(file, destination), /EEXIST/);
  const restored = storage.importTodos(path.join(folder, "restored.json"), exported);
  assert.deepEqual(restored, storage.readTodos(file).sections);
});

test("custom shortcuts provide explicit macOS and Windows bindings", () => {
  assert.deepEqual(shortcut("p", ["cmd", "opt"]), { macOS: { key: "p", modifiers: ["cmd", "opt"] }, Windows: { key: "p", modifiers: ["ctrl", "alt"] } });
  assert.deepEqual(shortcut("e", ["cmd", "shift"]).Windows, { key: "e", modifiers: ["ctrl", "shift"] });
});

test("tag discovery includes literal All and deduplicates across sections", () => {
  assert.deepEqual(getTags({ pinned: [item("a", { tag: "All" })], todo: [item("b", { tag: "All" }), item("c", { tag: "Work" }), item("d", { tag: "" })], completed: [] }), ["All", "Work"]);
});

test("AI search distinguishes the All tag from all tasks and paginates accurately", () => {
  const data = sections([item("One", { tag: "All" }), item("Two", { tag: "Work" }), item("Three", { tag: "All" })]);
  const first = searchTodos(data, { tag: "All", limit: 1 });
  assert.equal(first.total, 2);
  assert.equal(first.nextOffset, 1);
  assert.equal(first.todos[0].title, "One");
  const last = searchTodos(data, { tag: "All", limit: 1, offset: first.nextOffset });
  assert.equal(last.todos[0].title, "Three");
  assert.equal(last.nextOffset, null);
  assert.equal(searchTodos(data, {}).total, 3);
  assert.throws(() => searchTodos(data, { limit: 0 }));
  assert.throws(() => searchTodos(data, { offset: -1 }));
});

test("AI filters combine pinned, completed, title, and priority states", () => {
  const data = { pinned: [item("WRITE report", { priority: 3 }), item("Write draft", { completed: true, priority: 3 })], todo: [item("Write tests", { priority: 3 })], completed: [] };
  const result = searchTodos(data, { pinned: true, priority: "high", status: "incomplete", query: "write" });
  assert.deepEqual(result.todos.map((todo) => todo.title), ["WRITE report"]);
  assert.equal(searchTodos(data, { status: "completed" }).total, 1);
});

test("due filters honor local midnight and summary counts exclude completed deadlines", () => {
  const now = new Date(2026, 8, 25, 12);
  const midnight = new Date(2026, 8, 25).getTime();
  const tomorrow = new Date(2026, 8, 26).getTime();
  const data = { pinned: [item("Completed", { completed: true, dueDate: midnight - 1, tag: "All" })], todo: [item("Today", { dueDate: midnight, priority: 3, tag: "All" }), item("Tomorrow", { dueDate: tomorrow }), item("Undated")], completed: [] };
  assert.deepEqual(searchTodos(data, { due: "today" }, now).todos.map((todo) => todo.title), ["Today"]);
  assert.equal(searchTodos(data, { due: "upcoming" }, now).todos[0].title, "Tomorrow");
  assert.equal(searchTodos(data, { due: "none" }, now).total, 1);
  assert.equal(searchTodos(data, { due: "overdue", status: "incomplete" }, now).total, 1);
  const summary = summarizeTodos(data, now);
  assert.equal(summary.overdue, 1);
  assert.equal(summary.dueToday, 1);
  assert.equal(summary.completed, 1);
  assert.equal(summary.priorities.high, 1);
  assert.deepEqual(summary.tags, [{ tag: "All", incomplete: 1, completed: 1 }]);
  assert.deepEqual(structuredClone(summary), summary);
});

function uiMocks(saved, setSaved = () => {}) {
  const atoms = {
    todoAtom: Symbol("todos"), selectedTagAtom: Symbol("tag"), ALL_TAG_VALUE: "",
    editingAtom: Symbol("editing"), editingTagAtom: Symbol("editing-tag"), editingTagNameAtom: Symbol("tag-name"),
    searchBarTextAtom: Symbol("text"), editingDueDateAtom: Symbol("editing-date"), editingDueDateValueAtom: Symbol("date"),
  };
  const React = require("react");
  const MenuBarExtra = Object.assign(() => null, { Item: "menu-item", Separator: "separator" });
  const config = {
    preferences: { completed: "latest", sortOrder: "title_ascending", useConfetti: false },
    SECTIONS_DATA: { pinned: { name: "Pinned" }, todo: { name: "Todo" }, completed: { name: "Completed" } },
  };
  return {
    atoms,
    mocks: {
      "./atoms": atoms, "../atoms": atoms,
      "./config": config, "../config": config,
      jotai: { useAtom: (atom) => atom === atoms.todoAtom ? [saved, setSaved] : ["All", () => {}] },
      react: { ...React, useEffect: () => {}, useMemo: (fn) => fn() },
      "@raycast/utils": { showFailureToast: async () => {} },
      "@raycast/api": {
        MenuBarExtra, Keyboard: { Shortcut: { Common: { New: {} } } },
        List: { Section: "list-section", Dropdown: Object.assign(() => null, { Item: "dropdown-item" }) },
      },
    },
  };
}
function descendants(element) {
  if (!element || typeof element !== "object") return [];
  const children = [element.props?.children].flat(Infinity);
  return [element, ...children.flatMap(descendants)];
}

test("All tag dropdown has a separate value from the built-in all-tasks filter", () => {
  const { mocks } = uiMocks(sections([item("Tagged", { tag: "All" })]));
  const Dropdown = load("src/list_tags.tsx", mocks).default;
  const rendered = Dropdown();
  const options = descendants(rendered).filter((element) => element.type === "dropdown-item");
  assert.deepEqual(options.map((option) => [option.props.title, option.props.value]), [["All Todos", ""], ["All", "All"]]);
  assert.equal(rendered.props.value, "All");
});

test("sorting and filtering the main list preserve the original storage indices", () => {
  const data = sections([item("Zulu", { tag: "Work" }), item("Alpha", { tag: "All" }), item("Bravo", { tag: "All" })]);
  const { mocks } = uiMocks(data);
  // Child actions are tested through useTodo separately.
  mocks["./todo_item"] = { __esModule: true, default: "todo-item" };
  const Section = load("src/todo_section.tsx", mocks).default;
  const rendered = Section({ sectionKey: "todo", selectedTag: "All" });
  const rows = descendants(rendered).filter((element) => element.type === "todo-item");
  assert.deepEqual(rows.map((row) => [row.props.item.title, row.props.idx]), [["Alpha", 1], ["Bravo", 2]]);
  assert.deepEqual(data.todo.map((todo) => todo.title), ["Zulu", "Alpha", "Bravo"]);
});

test("limited menu-bar rows update the task displayed, without mutating stored arrays", async () => {
  const data = { pinned: [], todo: [], completed: ["Zulu", "Bravo", "Alpha", "Charlie"].map((title) => item(title, { completed: true })) };
  let updated;
  const { mocks } = uiMocks(data, (value) => { updated = value; });
  const Menu = load("src/menu_bar.tsx", mocks).default;
  const list = descendants(Menu()).find((element) => element.props?.sectionKey === "completed");
  const rows = descendants(list.type(list.props)).filter((element) => element.props?.item);
  assert.deepEqual(rows.map((row) => [row.props.item.title, row.props.idx]), [["Alpha", 2], ["Bravo", 1], ["Charlie", 3]]);
  const selected = rows[2];
  await selected.type(selected.props).props.onAction();
  assert.equal(updated.todo[0].title, "Charlie");
  assert.deepEqual(updated.completed.map((todo) => todo.title), ["Zulu", "Bravo", "Alpha"]);
  assert.deepEqual(data.completed.map((todo) => todo.title), ["Zulu", "Bravo", "Alpha", "Charlie"]);
  assert.ok(data.completed.every((todo) => todo.completed));
});

test("failed task writes leave the previous UI state untouched", () => {
  const data = sections([item("Keep", { priority: 1 })]);
  const { mocks } = uiMocks(data, () => { throw new Error("disk full"); });
  const { useTodo } = load("src/hooks/useTodo.ts", mocks);
  const actions = useTodo({ item: data.todo[0], idx: 0, sectionKey: "todo" });
  assert.throws(() => actions.setPriority(3), /disk full/);
  assert.throws(() => actions.markCompleted(), /disk full/);
  assert.throws(() => actions.deleteTodo(), /disk full/);
  assert.equal(data.todo[0].priority, 1);
  assert.equal(data.todo[0].completed, false);
  assert.equal(data.todo.length, 1);
});

test("AI entry points read fresh storage and return cloneable results without writing", (t) => {
  const { file } = fixture(t);
  storage.writeTodos(file, sections([item("Original")]), null);
  const mocks = { "../config": { TODO_FILE: file } };
  const list = load("src/tools/list-todos.ts", mocks).default;
  const summary = load("src/tools/summarize-todos.ts", mocks).default;
  assert.equal(list({}).todos[0].title, "Original");
  const updated = JSON.stringify(sections([item("Changed")]));
  fs.writeFileSync(file, updated);
  const results = [list({}), summary()];
  assert.equal(results[0].todos[0].title, "Changed");
  assert.equal(results[1].total, 1);
  assert.deepEqual(structuredClone(results), results);
  assert.equal(fs.readFileSync(file, "utf8"), updated);
  assert.equal(fs.existsSync(`${file}.backup`), false);
});

for (const change of ["menu-bar save", "import", "deleted file"]) {
  test(`an open list recovers after a ${change} without overwriting the newer data`, (t) => {
    const { file } = fixture(t);
    const original = storage.writeTodos(file, sections([item("Original")]), null);
    const toasts = [];
    const atoms = load("src/atoms.ts", {
      "./config": { TODO_FILE: file },
      "@raycast/api": { Toast: { Style: { Failure: "failure" } }, showToast: async (toast) => toasts.push(toast) },
    });
    const store = require("jotai/vanilla").createStore();
    const newer = change === "deleted file" ? sections() : sections([item("Newer")]);
    store.set(atoms.editingAtom, { sectionKey: "todo", index: 0 });
    store.set(atoms.editingTagAtom, { sectionKey: "todo", index: 0 });
    store.set(atoms.editingDueDateAtom, { sectionKey: "todo", index: 0 });
    if (change === "import") storage.importTodos(file, JSON.stringify(newer));
    else if (change === "deleted file") fs.unlinkSync(file);
    else storage.writeTodos(file, newer, original);
    assert.throws(() => store.set(atoms.todoAtom, sections([item("Stale edit")])), /changed in another command/);
    assert.deepEqual(store.get(atoms.todoAtom), storage.parseTodos(JSON.stringify(newer)));
    for (const atom of [atoms.editingAtom, atoms.editingTagAtom, atoms.editingDueDateAtom]) assert.equal(store.get(atom), false);
    assert.equal(toasts.length, 1);
    const next = structuredClone(store.get(atoms.todoAtom));
    next.todo.push(item("Retry"));
    store.set(atoms.todoAtom, next);
    assert.deepEqual(storage.readTodos(file).sections, storage.parseTodos(JSON.stringify(next)));
    if (change !== "deleted file") assert.equal(storage.readTodos(file).sections.todo[0].title, "Newer");
  });
}

test("refreshing a conflict never replaces visible tasks with corrupt storage", (t) => {
  const { file } = fixture(t);
  const original = sections([item("Keep")]);
  storage.writeTodos(file, original, null);
  const { todoAtom } = load("src/atoms.ts", {
    "./config": { TODO_FILE: file },
    "@raycast/api": { Toast: { Style: { Failure: "failure" } }, showToast: async () => {} },
  });
  const store = require("jotai/vanilla").createStore();
  fs.writeFileSync(file, "broken");
  assert.throws(() => store.set(todoAtom, sections()));
  assert.deepEqual(store.get(todoAtom), storage.parseTodos(JSON.stringify(original)));
  assert.equal(fs.readFileSync(file, "utf8"), "broken");
});

test("backup and menu-bar launch failures show a toast without rejecting the action", async () => {
  const { mocks } = uiMocks(sections());
  const launches = [];
  const failures = [];
  mocks["@raycast/api"] = {
    ...mocks["@raycast/api"], Action: "action", Icon: {}, LaunchType: { UserInitiated: "user" },
    launchCommand: async (options) => { launches.push(options.name); throw new Error("Launch failed"); },
  };
  mocks["@raycast/utils"] = { showFailureToast: async (error, options) => failures.push([error.message, options.title]) };
  const Backup = load("src/backup_actions.tsx", mocks).default;
  for (const action of descendants(Backup()).filter((node) => node.type === "action")) await action.props.onAction();
  const Menu = load("src/menu_bar.tsx", mocks).default;
  await descendants(Menu()).find((node) => node.props?.title === "Add Todo").props.onAction();
  assert.deepEqual(launches, ["export-todos", "import-todos", "index"]);
  assert.equal(failures.length, 3);
  assert.ok(failures.every(([message]) => message === "Launch failed"));
});
