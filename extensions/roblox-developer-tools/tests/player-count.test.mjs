import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function compile(file) {
  return ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
}
const commandCode = compile("../src/player-count.tsx");
async function run(preferences, playing) {
  const exports = {};
  let state = { loading: true };
  let effect;
  const MenuBarExtra = Object.assign(() => {}, {
    Item: () => {},
    Separator: () => {},
  });
  runInNewContext(commandCode, {
    exports,
    require(name) {
      if (name === "./game-page" || name === "./launch")
        return { default: async () => {} };
      if (name === "react/jsx-runtime")
        return {
          jsx: (type, props) => ({ type, props }),
          jsxs: (type, props) => ({ type, props }),
        };
      if (name === "react")
        return {
          useState: () => [
            state,
            (next) => {
              state = next;
            },
          ],
          useEffect: (fn) => {
            effect = fn;
          },
        };
      if (name === "@raycast/api")
        return {
          MenuBarExtra,
          Icon: {},
          getPreferenceValues: () => preferences,
        };
      if (name === "./utils")
        return {
          settings: () => ({ universeId: "123" }),
          fetchPlayerCount: async () => ({ name: "Game", playing }),
        };
      throw new Error(name);
    },
  });
  assert.equal(exports.default().props.isLoading, true);
  effect();
  await new Promise(setImmediate);
  return () => exports.default();
}
test("turning the native preference off restores zero without another fetch", async () => {
  const preferences = { hideZeroPlayers: true };
  const render = await run(preferences, 0);
  assert.equal(render(), null);
  preferences.hideZeroPlayers = false;
  assert.equal(render().props.title, "0");
  preferences.hideZeroPlayers = true;
  assert.equal(render(), null);
});
test("unset and disabled native preferences show zero; enabled hiding shows nonzero", async () => {
  for (const hideZeroPlayers of [undefined, false]) {
    assert.equal((await run({ hideZeroPlayers }, 0))().props.title, "0");
  }
  assert.equal((await run({ hideZeroPlayers: true }, 12))().props.title, "12");
});
