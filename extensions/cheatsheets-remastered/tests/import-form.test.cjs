const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const React = require("react");

// Run the component and installed useForm hook with deterministic hook state.
// Only native UI, disk reads and persistence are replaced at their boundaries.
function fixture() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const cleanups = [];
  const events = { reads: [], writes: [], toasts: [], refreshes: 0, pops: 0 };
  const slot = (init) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = init();
    return index;
  };
  const hooks = {
    useState(initial) {
      const index = slot(() => (typeof initial === "function" ? initial() : initial));
      return [slots[index], (next) => (slots[index] = typeof next === "function" ? next(slots[index]) : next)];
    },
    useRef(initial) {
      return slots[slot(() => ({ current: initial }))];
    },
    useMemo(fn) {
      cursor++;
      return fn();
    },
    useCallback(fn) {
      cursor++;
      return fn;
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!slots[index] || deps?.some((value, i) => value !== slots[index][i])) {
        slots[index] = deps;
        effects.push(() => cleanups.push(fn()));
      }
    },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  const native = {
    environment: { commandMode: "view" },
    Color: { PrimaryText: "text" },
    Icon: { Document: "document" },
    Action: { SubmitForm: "SubmitForm" },
    ActionPanel: "ActionPanel",
    Toast: { Style: { Success: "success", Failure: "failure" } },
    useNavigation: () => ({ pop: () => events.pops++ }),
    showToast: async (toast) => events.toasts.push(toast),
  };
  native.Form = Object.assign(() => {}, {
    Description: "Description",
    FilePicker: "FilePicker",
    TextField: "TextField",
    TextArea: "TextArea",
  });
  const readLocalMarkdown = (path, signal) => {
    const pending = deferred();
    events.reads.push({ path, signal, ...pending });
    return pending.promise;
  };
  const service = {
    importCustomCheatsheet: (sheet, signal) => {
      const pending = deferred();
      events.writes.push({ sheet, signal, ...pending });
      return pending.promise;
    },
  };
  const originalLoad = Module._load;
  const componentPath = require.resolve("../.test-dist/import-markdown-file");
  const sdkPath = require.resolve("@raycast/utils");
  delete require.cache[componentPath];
  delete require.cache[sdkPath];
  Module._load = function (name, ...args) {
    if (name === "@raycast/api") return native;
    if (name === "./local-markdown") return { readLocalMarkdown };
    if (name === "./service") return { __esModule: true, default: service };
    return originalLoad.call(this, name, ...args);
  };
  let Component;
  try {
    Component = require(componentPath).ImportMarkdownFile;
  } finally {
    Module._load = originalLoad;
  }
  let tree;
  function render() {
    cursor = 0;
    const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const previous = internals.H;
    internals.H = hooks;
    try {
      tree = Component({ onImported: () => events.refreshes++ });
    } finally {
      internals.H = previous;
    }
    const pending = effects;
    effects = [];
    pending.forEach((effect) => effect());
    return tree;
  }
  function field(id) {
    return React.Children.toArray(tree.props.children).find((child) => child.props.id === id).props;
  }
  render();
  return {
    events,
    field,
    render,
    select: (paths) => field("file").onChange(paths),
    edit(id, value) {
      field(id).onChange(value);
      render();
    },
    submit() {
      const values = Object.fromEntries(["title", "tags", "description"].map((id) => [id, field(id).value]));
      return tree.props.actions.props.children.props.onSubmit(values);
    },
    unmount: () => cleanups.forEach((cleanup) => cleanup?.()),
  };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const sheet = { title: "Git Reference", tags: ["Git", "CLI"], description: "Quick reference", content: "# Git\n" };
async function load(form, value = sheet) {
  const pending = form.select(["notes.md"]);
  form.events.reads.at(-1).resolve(value);
  await pending;
  form.render();
}

test("import title and optional description have hints without changing values", () => {
  const form = fixture();
  assert.ok(form.field("title").placeholder);
  assert.match(form.field("description").placeholder, /optional/i);
  assert.equal(form.field("title").value, "");
  assert.equal(form.field("description").value, "");
});
for (const title of ["", " \t\n "]) {
  test(`import rejects ${JSON.stringify(title)} with required feedback and clears it after an edit`, async () => {
    const form = fixture();
    await load(form);
    form.edit("title", title);
    assert.equal(await form.submit(), false);
    form.render();
    assert.match(form.field("title").error, /required/i);
    assert.equal(form.events.writes.length, 0);
    form.edit("title", "Edited title");
    assert.equal(form.field("title").error, undefined);
  });
}
test("import validates the title on blur", async () => {
  const form = fixture();
  await load(form);
  form.edit("title", "   ");
  form.field("title").onBlur({ target: { value: "   " } });
  form.render();
  assert.match(form.field("title").error, /required/i);
});
test("import prefills metadata and submits user edits once, refreshing before navigation", async () => {
  const form = fixture();
  await load(form);
  assert.equal(form.field("title").value, "Git Reference");
  assert.equal(form.field("tags").value, "Git, CLI");
  assert.equal(form.field("description").value, "Quick reference");
  form.edit("title", "Edited Git");
  form.edit("description", "Edited summary");
  form.edit("tags", "Shell, Notes");
  const submit = form.submit();
  await form.submit();
  assert.equal(form.events.writes.length, 1);
  assert.deepEqual(form.events.writes[0].sheet, {
    ...sheet,
    title: "Edited Git",
    description: "Edited summary",
    tags: ["Shell", "Notes"],
  });
  await form.select(["ignored.md"]);
  assert.equal(form.events.reads.length, 1);
  form.events.writes[0].resolve({ status: "imported", sheet: { title: "Edited Git" } });
  await submit;
  assert.equal(form.events.refreshes, 1);
  assert.equal(form.events.pops, 1);
});
test("replacing a loading file aborts it and stale completion cannot overwrite new metadata", async () => {
  const form = fixture();
  const first = form.select(["first.md"]);
  form.render();
  form.edit("title", "Attempt during read");
  await form.submit();
  assert.equal(form.events.writes.length, 0);
  const second = form.select(["second.md"]);
  assert.equal(form.events.reads[0].signal.aborted, true);
  form.events.reads[1].resolve({ ...sheet, title: "Second" });
  await second;
  form.events.reads[0].resolve({ ...sheet, title: "Stale" });
  await first;
  form.render();
  assert.equal(form.field("title").value, "Second");
  form.edit("title", "Second edited");
  const third = form.select(["third.md"]);
  form.events.reads[2].resolve({ title: "Third", content: "# Third" });
  await third;
  form.render();
  assert.equal(form.field("title").value, "Third");
  assert.equal(form.field("description").value, "");
  assert.equal(form.field("tags").value, "");
});
test("invalid files and cleared selections cannot submit a previously loaded copy", async () => {
  const form = fixture();
  await load(form);
  const invalid = form.select(["invalid.md"]);
  form.events.reads[1].reject(new Error("Invalid UTF-8"));
  await invalid;
  form.render();
  form.edit("title", "Valid title");
  await form.submit();
  form.render();
  assert.match(form.field("file").error, /Invalid UTF-8/);
  await form.select([]);
  form.render();
  form.edit("title", "Valid title");
  await form.submit();
  form.render();
  assert.ok(form.field("file").error);
  assert.equal(form.events.writes.length, 0);
});
test("leaving during reading aborts and prevents stale submission", async () => {
  const form = fixture();
  const pending = form.select(["notes.md"]);
  form.unmount();
  assert.equal(form.events.reads[0].signal.aborted, true);
  form.events.reads[0].resolve(sheet);
  await pending;
  await form.submit();
  assert.equal(form.events.writes.length, 0);
});
test("leaving during submission aborts but a confirmed write still refreshes without popping", async () => {
  const form = fixture();
  await load(form);
  const pending = form.submit();
  form.unmount();
  assert.equal(form.events.writes[0].signal.aborted, true);
  form.events.writes[0].resolve({ status: "imported", sheet });
  await pending;
  assert.equal(form.events.refreshes, 1);
  assert.equal(form.events.pops, 0);
  assert.equal(form.events.toasts.length, 0);
});
test("duplicate acknowledgement refreshes without navigation or claiming a new import", async () => {
  const form = fixture();
  await load(form);
  const pending = form.submit();
  form.events.writes[0].resolve({ status: "duplicate", sheet });
  await pending;
  assert.equal(form.events.refreshes, 1);
  assert.equal(form.events.pops, 0);
  assert.match(form.events.toasts[0].title, /already/i);
});

test("valid loaded metadata clears required feedback from submission during reading", async () => {
  const form = fixture();
  const pending = form.select(["notes.md"]);
  form.render();
  await form.submit();
  form.render();
  assert.match(form.field("title").error, /required/i);
  form.events.reads[0].resolve(sheet);
  await pending;
  form.render();
  assert.equal(form.field("title").value, "Git Reference");
  assert.equal(form.field("title").error, undefined);
  assert.equal(form.events.writes.length, 0);
});

test("lost write acknowledgement reports failure and retry can confirm a duplicate honestly", async () => {
  const form = fixture();
  await load(form);
  const first = form.submit();
  form.events.writes[0].reject(new Error("Lost acknowledgement"));
  await first;
  form.render();
  assert.equal(form.events.refreshes, 0);
  assert.equal(form.events.pops, 0);
  assert.equal(form.events.toasts[0].style, "failure");
  assert.match(form.events.toasts[0].message, /Lost acknowledgement/);
  const retry = form.submit();
  form.events.writes[1].resolve({ status: "duplicate", sheet });
  await retry;
  assert.equal(form.events.refreshes, 1);
  assert.equal(form.events.pops, 0);
  assert.match(form.events.toasts[1].title, /already/i);
});
