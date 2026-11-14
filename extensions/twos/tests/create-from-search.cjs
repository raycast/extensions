// Run with: node tests/create-from-search.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

let state = [];
const jsx = (type, props) => ({ type, props });
const raycast = {
  Action: { Push: "Push", CopyToClipboard: "Copy", OpenInBrowser: "Open", SubmitForm: "Submit" },
  ActionPanel: "ActionPanel",
  List: { Section: "Section", Item: "Item", EmptyView: "EmptyView" },
  Form: { Dropdown: { Item: "DropdownItem" }, TextArea: "TextArea", TextField: "TextField" },
  Icon: {},
  Color: {},
  getPreferenceValues: () => ({}),
};
const mocks = {
  "@raycast/api": raycast,
  react: {
    useState: (initial) => [state.length ? state.shift() : initial, () => {}],
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useRef: () => ({}),
  },
  "react/jsx-runtime": { jsx, jsxs: jsx },
  "./api": {},
  "./useDesktopApp": { useDesktopApp: () => ({}), resolveOpenTarget: () => "browser" },
};
function load(name) {
  const source = fs.readFileSync(path.join(__dirname, "../src", name), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const context = { exports: {}, require: (id) => mocks[id] };
  vm.runInNewContext(outputText, context);
  return context.exports.default;
}
const AddThing = load("add-thing.tsx");
mocks["./add-thing"] = { default: AddThing };
const SearchThings = load("search-things.tsx");
function descendants(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(descendants);
  return [node, ...descendants(node.props?.children), ...descendants(node.props?.actions)];
}
const rows = [
  { kind: "list", list: { id: "list", title: "Shopping" } },
  { kind: "thing", thing: { id: "thing", text: "Oat milk", type: "note" } },
];
for (const results of [[], rows]) {
  for (const query of ["Buy oat milk", "  Keep my spacing  ", "", "   "]) {
    state = [query, results, false];
    const views = descendants(SearchThings()).filter((node) => ["Item", "EmptyView"].includes(node.type));
    assert.equal(views.length, results.length || 1);
    for (const view of views) {
      const actions = descendants(view.props.actions);
      const create = actions.filter((node) => node.type === "Push" && node.props.title === "Create Thing");
      assert.equal(create.length, query.trim() ? 1 : 0);
      if (!query.trim()) continue;
      const { target, shortcut } = create[0].props;
      assert.equal(shortcut.key, "n");
      assert.equal(shortcut.modifiers.join(), "cmd");
      assert.equal(target.type, AddThing);
      state = [];
      const field = descendants(AddThing(target.props)).find((node) => node.props?.id === "text");
      assert.equal(field.props.defaultValue, query);
      if (results.length) assert.notEqual(actions[1], create[0], "Keep the existing primary action");
    }
  }
}
state = [];
assert.equal(descendants(AddThing({})).find((node) => node.props?.id === "text").props.defaultValue, "");
console.log("Passed: create from list, thing, and empty results; blank queries; prefilled and standalone forms.");
