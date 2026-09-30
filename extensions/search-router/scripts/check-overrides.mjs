import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const requirePackage = createRequire(import.meta.url);

const cache = new Map();
let stateValues = [];
let errors = [];
const mocks = {
  "@raycast/api": {
    Action: { SubmitForm: "SubmitForm", CopyToClipboard: "CopyToClipboard", Style: {} },
    ActionPanel: { Section: "Section" },
    Form: { TextField: "TextField" },
    List: { Item: "Item", Dropdown: { Item: "DropdownItem" } },
    Icon: {},
    Keyboard: { Shortcut: { Common: {} } },
    Toast: { Style: {} },
    environment: { extensionName: "search-router-test" },
    getPreferenceValues: () => ({}),
    Cache: class {
      get(key) {
        return cache.get(key);
      }
      set(key, value) {
        cache.set(key, value);
      }
    },
    useNavigation: () => ({ pop() {}, push() {} }),
    showToast: async () => {},
  },
  "@raycast/utils": { useCachedState: (_key, initial) => [initial, () => {}] },
  react: {
    useState: (initial) => [
      stateValues.length ? stateValues.shift() : typeof initial === "function" ? initial() : initial,
      (value) => errors.push(value),
    ],
    useMemo: (fn) => fn(),
  },
  "react/jsx-runtime": {
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
  },
};
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (name) => {
      if (mocks[name]) return mocks[name];
      if (!name.startsWith(".")) return requirePackage(name);
      const base = path.resolve(path.dirname(file), name);
      return load([base + ".ts", base + ".tsx"].find(fs.existsSync));
    },
    module,
    module.exports,
  );
  return module.exports;
}
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node?.props) return [];
  return [node, ...elements(node.props.children), ...elements(node.props.actions)];
}
const src = path.resolve(import.meta.dirname, "../src");
const Add = load(path.join(src, "add-custom-search-engine.tsx")).default;
const Browse = load(path.join(src, "browse-search-engines.tsx")).default;
const { builtinSearchEngines } = load(path.join(src, "data/builtin-search-engines.ts"));
const { getSearchEngine, getBuiltinSearchEngine } = load(path.join(src, "data/search-engines.ts"));
const { getCustomSearchEngines, addCustomSearchEngine } = load(path.join(src, "data/custom-search-engines.ts"));
async function submit(trigger, engine) {
  errors = [];
  const form = Add({ engine, onEngineAdded() {} });
  const action = elements(form).find((element) => element.type === "SubmitForm");
  await action.props.onSubmit({ name: "Override", trigger, url_0: "https://custom.example/?q={{{s}}}" });
}
function row(trigger, filter) {
  stateValues = [trigger, filter];
  const item = elements(Browse()).find(
    (element) => element.type === "Item" && element.props.subtitle === `!${trigger}`,
  );
  assert.ok(item, `${filter} row for ${trigger}`);
  return item;
}
function canCopy(item) {
  return elements(item).some((element) => element.props.title === "Copy Search Engine Shortcut");
}

(async () => {
  const specialBuiltins = builtinSearchEngines.filter((engine) => !/^!?[a-zA-Z0-9-_]+$/.test(engine.t));
  assert.ok(specialBuiltins.some((engine) => engine.t === "c++"));
  for (const engine of specialBuiltins) {
    cache.clear();
    await submit(engine.t, engine);
    assert.equal(getSearchEngine(engine.t).u, "https://custom.example/?q={{{s}}}", engine.t);
  }
  for (const trigger of ["c++", " !C++ ", "my-engine_2"]) {
    cache.clear();
    await submit(trigger);
    assert.equal(getCustomSearchEngines().length, 1, trigger);
  }
  for (const trigger of ["", " ", "!", "two words", "unknown++"]) {
    cache.clear();
    await submit(trigger);
    assert.equal(getCustomSearchEngines().length, 0, trigger);
    assert.ok(errors.some((error) => typeof error === "string"));
  }
  cache.clear();
  await submit("c++", getBuiltinSearchEngine("c++"));
  await submit("!C++", getBuiltinSearchEngine("c++"));
  assert.ok(errors.includes("A custom search engine with this trigger already exists"));
  await submit("c++", getCustomSearchEngines()[0]);
  assert.ok(!errors.some((error) => typeof error === "string"));
  assert.equal(getCustomSearchEngines().length, 1);

  cache.clear();
  addCustomSearchEngine({
    s: "Custom Google",
    t: "g",
    d: "custom.example",
    u: "https://custom.example/?q={{{s}}}",
    isCustom: true,
  });
  assert.equal(canCopy(row("g", "builtin")), false);
  assert.equal(canCopy(row("b", "builtin")), true);
  assert.equal(canCopy(row("g", "custom")), true);
  assert.equal(canCopy(row("g", "all")), true);
  assert.equal(getSearchEngine("g").d, "custom.example");
  console.log(`Override checks passed, including ${specialBuiltins.length} special built-in triggers.`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
