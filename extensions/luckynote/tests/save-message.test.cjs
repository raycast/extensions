const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// Run the component's real handlers across renders, with deferred network saves.
async function fixture() {
  const slots = [];
  const effects = [];
  const notifications = [];
  const saves = [];
  let cursor = 0;
  let complete;
  let reject;
  const pending = new Promise((resolve, fail) => {
    complete = resolve;
    reject = fail;
  });
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (value) => {
          slots[index] = value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((value, i) => value !== slots[index][i])) {
        slots[index] = dependencies;
        effects.push(effect);
      }
    },
  };
  const Form = Object.assign(() => {}, {
    TextField: "TextField",
    TextArea: "TextArea",
    Description: "Description",
    Dropdown: Object.assign(() => {}, { Item: "DropdownItem" }),
  });
  const modules = {
    react,
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "@raycast/api": {
      Form,
      ActionPanel: "ActionPanel",
      Action: { SubmitForm: "SubmitForm" },
      Icon: {},
      Toast: { Style: { Failure: "failure", Success: "success" } },
      showHUD: async (title) => notifications.push({ hud: title }),
      showToast: async (options) => notifications.push(options),
    },
    "./lib/api": {
      authClient: () => ({ getTokens: async () => ({ accessToken: "session" }) }),
      getAccount: async () => ({ homeFolder: "inbox" }),
      getFolders: async () => [],
      saveMessage: (...args) => {
        saves.push(args);
        return pending;
      },
    },
  };
  const code = ts.transpileModule(fs.readFileSync(require.resolve("../src/save-message.tsx"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    Error,
    exports,
    require: (name) => modules[name],
    setTimeout: () => 0,
    clearTimeout() {},
  });
  function render() {
    cursor = 0;
    const tree = exports.default({});
    effects.splice(0).forEach((effect) => effect());
    return tree;
  }
  function find(predicate, node = render()) {
    if (!node || typeof node !== "object") return undefined;
    if (predicate(node)) return node;
    const children = [node.props?.actions, ...[node.props?.children].flat(Infinity)];
    for (const child of children.filter((child) => child != null)) {
      const result = find(predicate, child);
      if (result) return result;
    }
  }
  const field = (id) => find((node) => node.props?.id === id).props;
  const change = (id, value) => field(id).onChange(value);
  function submit() {
    const values = Object.fromEntries(["title", "body", "folderId"].map((id) => [id, field(id).value]));
    return find((node) => node.type === "SubmitForm").props.onSubmit(values);
  }
  render();
  await new Promise((resolve) => setImmediate(resolve));
  return { field, change, submit, complete, reject, saves, notifications };
}

test("edits during a save keep the entire newer draft and the editor open", async () => {
  const f = await fixture();
  f.change("title", "Submitted title");
  f.change("body", "Submitted body");
  const saving = f.submit();
  f.change("title", "New title");
  f.change("body", "New body");
  f.change("folderId", "another-folder");
  f.complete();
  await saving;
  assert.deepEqual(f.saves, [["inbox", "Submitted title", "Submitted body", false]]);
  assert.equal(f.field("title").value, "New title");
  assert.equal(f.field("body").value, "New body");
  assert.equal(f.field("folderId").value, "another-folder");
  assert.equal(f.notifications[0].style, "success");
  assert.equal(
    f.notifications.some((notification) => notification.hud),
    false
  );
});

test("unchanged successful saves clear the draft and prevent duplicate submissions", async () => {
  const f = await fixture();
  f.change("title", "Saved note");
  const saving = f.submit();
  await f.submit();
  assert.equal(f.saves.length, 1);
  f.complete();
  await saving;
  assert.equal(f.field("title").value, "");
  assert.equal(f.field("body").value, "");
  assert.equal(f.field("folderId").value, "inbox");
  assert.equal(f.notifications[0].hud, "Saved to Luckynote");
});

test("failed saves retain the draft and show the error", async () => {
  const f = await fixture();
  f.change("title", "Keep this note");
  const saving = f.submit();
  f.reject(new Error("Save failed"));
  await saving;
  assert.equal(f.field("title").value, "Keep this note");
  assert.equal(f.notifications[0].style, "failure");
});
