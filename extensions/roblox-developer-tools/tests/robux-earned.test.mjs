import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const code = ts.transpileModule(
  readFileSync(new URL("../src/robux-earned.tsx", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

function render(hideZeroEarnings, total, loading, error) {
  const exports = {};
  const preferences = { hideZeroEarnings, earningsDisplay: "robux" };
  const states = [
    { snapshot: { total, asOf: Date.now() }, error },
    loading,
    undefined,
  ];
  const MenuBarExtra = Object.assign(() => {}, {
    Item: () => {},
    Separator: () => {},
  });
  runInNewContext(code, {
    exports,
    require(name) {
      if (name === "react/jsx-runtime")
        return {
          jsx: (type, props) => ({ type, props }),
          jsxs: (type, props) => ({ type, props }),
        };
      if (name === "react")
        return {
          useState: () => [states.shift(), () => {}],
          useRef: () => ({ current: false }),
          useMemo: (fn) => fn(),
          useCallback: (fn) => fn,
          useEffect: () => {},
        };
      if (name === "@raycast/api")
        return {
          Cache: class {},
          getPreferenceValues: () => preferences,
          MenuBarExtra,
          Icon: {},
        };
      if (name === "./earnings")
        return {
          earningsConfig: () => ({
            source: "account",
            id: "123",
            period: "30",
          }),
          earningsCacheKey: () => "cache",
          periods: { 30: "Last 30 Days" },
          formatEarnings: String,
        };
      throw new Error(name);
    },
  });
  return exports.EarningsMenu({ preferences });
}

test("disabled or unset hide-zero preference always renders the amount", () => {
  for (const preference of [false, undefined]) {
    for (const total of [0, 50]) {
      assert.equal(render(preference, total, false).props.title, String(total));
    }
  }
});
test("hidden zero retains Raycast's loading lifecycle until refresh completes", () => {
  assert.equal(render(true, 0, true).props.isLoading, true);
  assert.equal(render(true, 0, false), null);
  assert.equal(render(true, 50, false).props.title, "50");
});
test("errors remain visible even when a previous zero would be hidden", () => {
  assert.ok(render(true, 0, false, "Unable to load earnings"));
});
