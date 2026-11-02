import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { test } from "node:test";

function harness({ allDay = false, update = async () => {} } = {}) {
  const state = []; let index = 0; let pops = 0; let refreshes = 0;
  const calls = []; const toasts = [];
  const component = (name) => name;
  const Form = Object.assign(component("Form"), {
    TextField: "TextField", TextArea: "TextArea",
    DatePicker: Object.assign(component("DatePicker"), { Type: { Date: "date", DateTime: "time" } }),
  });
  const Action = Object.assign(component("Action"), { OpenInBrowser: "OpenInBrowser" });
  const modules = {
    "@raycast/api": {
      Form,
      Action,
      ActionPanel: "ActionPanel",
      Icon: { Checkmark: "check" },
      Keyboard: {
        Shortcut: {
          Common: new Proxy({}, { get: (_, key) => key }),
        },
      },
      Toast: { Style: { Failure: "failure", Success: "success" } },
      showToast: async (toast) => toasts.push(toast),
      useNavigation: () => ({ pop: () => pops++ }),
    },
    react: {
      useState(initial) { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], (value) => { state[i] = value; }]; },
      useRef(initial) { const i = index++; if (!(i in state)) state[i] = { current: initial }; return state[i]; },
    },
    "./lib/google": { updateEvent: async (...args) => { calls.push(args); return update(...args); } },
  };
  const exports = {};
  const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat().filter(Boolean) });
  const code = ts.transpileModule(fs.readFileSync(new URL("../src/edit-event.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, jsxFactory: "h" },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => { assert.ok(name in modules, name); return modules[name]; }, h, Date, Error });
  let tree;
  function render() {
    index = 0;
    tree = exports.default({ calendar: { id: "demo", summary: "Demo" }, event: { id: "event", summary: "Test", location: "Office", start: allDay ? { date: "2026-09-16" } : { dateTime: "2026-09-16T10:00:00Z" }, end: allDay ? { date: "2026-09-18" } : { dateTime: "2026-09-16T13:00:00Z" } }, onSaved: async () => { refreshes++; } });
  }
  render();
  return {
    calls, toasts, get pops() { return pops; }, get refreshes() { return refreshes; },
    change(id, value) { tree.children.find((child) => child.props.id === id).props.onChange(value); render(); },
    save() { return tree.props.actions.children.find((child) => child.type === Action).props.onAction(); },
  };
}

test("Save uses current field values without native SubmitForm dispatch", async () => {
  const h = harness();
  h.change("title", "Updated"); h.change("start", new Date("2026-09-16T12:00:00Z")); h.change("end", new Date("2026-09-16T14:00:00Z")); h.change("location", ""); h.change("description", "Details");
  await h.save();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])), ["demo", "event", { summary: "Updated", start: { dateTime: "2026-09-16T12:00:00.000Z" }, end: { dateTime: "2026-09-16T14:00:00.000Z" }, location: "", description: "Details" }]);
  assert.equal(h.pops, 1); assert.equal(h.refreshes, 1);
  assert.equal(h.toasts.at(-1).title, "Event updated");
});

test("invalid dates and blank titles do not write; corrected input can save", async () => {
  const h = harness(); h.change("title", " "); await h.save();
  h.change("title", "Test"); h.change("end", new Date("2026-09-16T09:00:00Z")); await h.save();
  h.change("start", null); await h.save();
  assert.equal(h.calls.length, 0); assert.equal(h.pops, 0);
  h.change("start", new Date("2026-09-16T12:00:00Z")); await h.save();
  assert.equal(h.calls.length, 1);
});

test("all-day edits preserve Google's exclusive end date", async () => {
  const h = harness({ allDay: true }); await h.save();
  assert.equal(h.calls[0][2].start.date, "2026-09-16");
  assert.equal(h.calls[0][2].end.date, "2026-09-18");
});

test("repeated Save clicks send one request and API failures allow retry", async () => {
  let reject; let attempts = 0;
  const h = harness({ update: () => ++attempts === 1 ? new Promise((_, fail) => { reject = fail; }) : Promise.resolve() });
  const pending = h.save(); await h.save(); assert.equal(h.calls.length, 1);
  reject(new Error("Test failure")); await pending;
  assert.equal(h.pops, 0); assert.equal(h.toasts.at(-1).message, "Test failure");
  await h.save(); assert.equal(h.calls.length, 2); assert.equal(h.pops, 1);
});
