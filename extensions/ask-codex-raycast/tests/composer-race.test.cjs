const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Drive the actual component's callbacks with deterministic hook state. Native
// Raycast UI is replaced; no CLI process or real prompt is started by this test.
function composer(onSend, savedDraft = "") {
  const slots = [];
  let cursor = 0;
  const react = {
    useRef(value) {
      const id = cursor++;
      if (!(id in slots)) slots[id] = { current: value };
      return slots[id];
    },
    useState(value) {
      const id = cursor++;
      if (!(id in slots)) slots[id] = value;
      return [slots[id], (next) => { slots[id] = typeof next === "function" ? next(slots[id]) : next; }];
    },
  };
  const jsx = (type, props) => ({ type, props });
  const action = Object.assign(() => {}, { CopyToClipboard: "copy" });
  const api = {
    Action: action,
    ActionPanel: { Submenu: "submenu", Section: "section" },
    Icon: {}, Toast: { Style: { Failure: "failure" } },
    showToast: async () => {},
  };
  const filename = path.resolve(__dirname, "../src/message-composer.tsx");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (id) => {
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (id === "@raycast/api") return api;
    throw new Error(`Unexpected component dependency: ${id}`);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  }).outputText, filename);
  const props = { draft: savedDraft, busy: false, ready: true, onChange: (text) => { props.draft = text; }, onSend };
  function render() { cursor = 0; return loaded.exports.MessageComposer(props); }
  function actions(node) {
    if (!node || typeof node !== "object") return [];
    return [node, ...[node.props?.children].flat(Infinity).flatMap(actions)];
  }
  return {
    open() { render().props.onOpen(); render().props.onSearchTextChange(""); },
    type(text) { render().props.onSearchTextChange(text); },
    async send() { return actions(render()).find((node) => node.type === action && node.props.title.startsWith("Send")).props.onAction(); },
    preview() { return actions(render()).find((node) => node.type === "section").props.title; },
    get draft() { return props.draft; },
  };
}

for (const next of ["second message", "first message"]) {
  test(`late acknowledgement preserves a newly entered ${next === "first message" ? "identical" : "different"} message`, async () => {
    let acknowledge;
    const submitted = [];
    const ui = composer((text) => {
      submitted.push(text);
      return submitted.length === 1 ? new Promise((resolve) => { acknowledge = resolve; }) : Promise.resolve(true);
    });
    ui.open(); ui.type("first message");
    const pending = ui.send();
    ui.type(""); // native popover closes/reset
    ui.open(); ui.type(next);
    acknowledge(true); await pending;
    assert.equal(ui.preview(), `Pending · ${next}`);
    assert.equal(ui.draft, next);
    await ui.send();
    assert.deepEqual(submitted, ["first message", next]);
  });
}

test("a failed submission leaves the visible message available for retry", async () => {
  const ui = composer(async () => false);
  ui.open(); ui.type("retry this"); await ui.send();
  assert.equal(ui.preview(), "Pending · retry this");
  assert.equal(ui.draft, "retry this");
});

test("a saved draft can still be sent after the native opening reset", async () => {
  let sent;
  const ui = composer(async (text) => { sent = text; return true; }, "saved draft");
  ui.open(); await ui.send();
  assert.equal(sent, "saved draft");
});
