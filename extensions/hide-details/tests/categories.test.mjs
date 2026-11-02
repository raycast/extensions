import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function harness(preferences = {}, saved) {
  let value = saved;
  const writes = [];
  const module = { exports: {} };
  const source = await readFile(new URL("../src/categories.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require: () => ({
      getPreferenceValues: () => preferences,
      LocalStorage: {
        getItem: async () => value,
        setItem: async (key, next) => {
          writes.push({ key, next });
          value = next;
        },
        removeItem: async () => {
          value = undefined;
        },
      },
    }),
  });
  return { ...module.exports, writes };
}

test("category migration preserves defaults, empty, subset, case and repeated legacy selections", async () => {
  for (const [preferences, expected] of [
    [{}, ["email", "phone", "card", "secret", "ip", "name", "face"]],
    [{ categories: "" }, []],
    [{ categories: " FACE, Email ,email" }, ["email", "face"]],
  ]) {
    const settings = await harness(preferences);
    assert.deepEqual(Array.from(await settings.loadCategories()), expected);
    assert.equal(settings.writes.length, 0, "opening or scanning never changes preferences");
  }
});

test("checkbox selections override legacy settings for both commands and remain reversible", async () => {
  const settings = await harness({ categories: "face" });
  await settings.saveCategories(["email", "name"]);
  assert.deepEqual(Array.from(await settings.loadCategories()), ["email", "name"]);
  await settings.saveCategories([]);
  assert.deepEqual(Array.from(await settings.loadCategories()), []);
  await settings.restoreLegacyCategories();
  assert.deepEqual(Array.from(await settings.loadCategories()), ["face"]);
  await settings.saveCategories(Array.from(settings.categories));
  assert.equal((await settings.loadCategories()).length, 7);
});

test("malformed stored settings and legacy typos fail closed instead of silently disabling protection", async () => {
  for (const saved of ["bad JSON", "null", '"email"', '["email", false]', '["typo"]']) {
    const settings = await harness({}, saved);
    await assert.rejects(settings.loadCategories(), /Configure What to Hide/);
    await settings.saveCategories(["email"]);
    assert.deepEqual(Array.from(await settings.loadCategories()), ["email"]);
  }
  const settings = await harness({ categories: "email,typo" });
  await assert.rejects(settings.loadCategories());
  await assert.rejects(settings.saveCategories(["unknown"]));
  assert.equal(settings.writes.length, 0);
});

test("checkbox form loads legacy values, saves changed selection, and restores previous settings", async () => {
  const settings = await harness({ categories: "email,face" });
  const hooks = [];
  let cursor = 0;
  let mount;
  let popped = 0;
  let rescanned = 0;
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  const source = await readFile(new URL("../src/category-settings.tsx", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2021 },
  });
  const replacements = {
    "./categories": settings,
    "@raycast/api": {
      useNavigation: () => ({
        pop: () => {
          popped++;
        },
      }),
      Form: { Checkbox: "Checkbox", Description: "Description" },
      Action: { SubmitForm: "Submit" },
      ActionPanel: "Actions",
      Icon: {},
      Toast: { Style: { Failure: "failure" } },
      showToast: async () => assert.fail("unexpected toast"),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in hooks)) hooks[index] = initial;
        return [
          hooks[index],
          (next) => {
            hooks[index] = typeof next === "function" ? next(hooks[index]) : next;
          },
        ];
      },
      useEffect(callback) {
        mount ??= callback;
      },
    },
  };
  vm.runInNewContext(outputText, { module, exports: module.exports, require: (name) => replacements[name] });
  const render = () => {
    cursor = 0;
    return module.exports.CategorySettings({
      onSave: () => {
        rescanned++;
      },
    });
  };
  render();
  const unmount = mount();
  // Resolve the asynchronous preference load and its finally callback.
  await new Promise((resolve) => setImmediate(resolve));
  const form = render();
  const boxes = form.props.children[1];
  assert.equal(boxes.length, 7);
  assert.ok(boxes.every((box) => box.type === "Checkbox"));
  assert.deepEqual(
    Array.from(
      boxes.filter((box) => box.props.value),
      (box) => box.props.id,
    ),
    ["email", "face"],
  );
  boxes.find((box) => box.props.id === "face").props.onChange(false);
  boxes.find((box) => box.props.id === "name").props.onChange(true);
  assert.equal(settings.writes.length, 0, "changing checkboxes alone does not save");
  await render().props.actions.props.children[0].props.onSubmit();
  assert.deepEqual(Array.from(await settings.loadCategories()), ["email", "name"]);
  assert.equal(popped, 1);
  assert.equal(rescanned, 1);
  await render().props.actions.props.children[2].props.onAction();
  assert.deepEqual(Array.from(await settings.loadCategories()), ["email", "face"]);
  unmount();
});
