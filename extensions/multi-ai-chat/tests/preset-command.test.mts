import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as presets from "../src/lib/presets.ts";
import * as promptUrls from "../src/lib/prompt-urls.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith(".js") && context.parentURL?.includes("/src/")) {
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
const { preparePresetExecution } =
  await import("../src/lib/preset-execution.ts");
const source = await readFile(
  new URL("../src/preset-command.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(`${source}\nexport { executePreset };`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

const preset: presets.PromptPreset = {
  id: "test",
  name: "Test",
  template: "Hello",
  serviceCounts: { chatgpt: 1, claude: 0, grok: 0, perplexity: 0 },
};

async function runCachedPreset(
  currentPreset: presets.PromptPreset,
  browserFails = false,
) {
  const toasts: { title: string; message?: string }[] = [];
  let opened = 0;
  const exports: Record<string, unknown> = {};
  const modules: Record<string, unknown> = {
    react: {},
    "react/jsx-runtime": {},
    "@raycast/api": {
      Toast: {
        Style: { Animated: "Animated", Failure: "Failure", Success: "Success" },
      },
      showToast: async (toast: { title: string; message?: string }) => {
        toasts.push(toast);
      },
      open: async () => {
        opened++;
        if (browserFails) throw new Error("Browser unavailable");
      },
      popToRoot: async () => {},
    },
    "./lib/prompt-urls.js": promptUrls,
    "./lib/preset-execution.js": { preparePresetExecution },
    "./lib/presets.js": presets,
    "./preset-config-form.js": {},
    "./lib/preset-storage.js": {
      loadPreset: async (
        _id: string,
        _storage: unknown,
        options: { onSyncError: (error: Error) => void },
      ) => {
        options.onSyncError(new Error("Cloud unavailable"));
        return currentPreset;
      },
    },
  };
  runInNewContext(compiled, {
    exports,
    require: (specifier: string) => {
      assert.ok(specifier in modules, `Unexpected import: ${specifier}`);
      return modules[specifier];
    },
  });
  const execute = exports.executePreset as (
    preset: presets.PromptPreset,
    values: object,
    browser: string,
    onChange: () => void,
  ) => Promise<void>;
  await execute(currentPreset, {}, "", () => {});
  return { toasts, opened };
}

test("running a cached preset opens tabs and keeps the cloud warning visible", async () => {
  const result = await runCachedPreset(preset);
  assert.equal(result.opened, 1);
  assert.equal(result.toasts.at(-1)!.title, "Opened 1 tab");
  assert.match(
    result.toasts.at(-1)!.message!,
    /Used the local saved prompt.*Cloud unavailable/,
  );
});

test("browser failures do not hide the cached execution's cloud warning", async () => {
  const result = await runCachedPreset(preset, true);
  assert.equal(result.opened, 1);
  assert.equal(result.toasts.at(-1)!.title, "0/1 tabs opened");
  assert.match(
    result.toasts.at(-1)!.message!,
    /Browser unavailable.*iCloud sync unavailable: Cloud unavailable/,
  );
});

test("a disabled cached preset still reports its sync warning", async () => {
  const result = await runCachedPreset({
    ...preset,
    serviceCounts: { chatgpt: 0, claude: 0, grok: 0, perplexity: 0 },
  });
  assert.equal(result.opened, 0);
  assert.match(
    result.toasts.at(-1)!.message!,
    /iCloud sync unavailable: Cloud unavailable/,
  );
});
