import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { AI_SERVICES } from "../src/lib/prompt-urls.ts";
import {
  DEFAULT_SERVICE_COUNTS,
  type PromptPreset,
} from "../src/lib/presets.ts";

const source = await readFile(
  new URL("../src/preset-config-form.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

type SyncOptions = { onSyncError?: (error: Error) => void };
type Toast = { title: string; message?: string };

function formHarness(
  save: (preset: PromptPreset, options: SyncOptions) => Promise<void>,
  pop: () => Promise<void> = async () => {},
) {
  const toasts: Toast[] = [];
  const saved: PromptPreset[] = [];
  const exports: Record<string, unknown> = {};
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  const modules: Record<string, unknown> = {
    react: {
      useState: (initial: unknown) => [
        typeof initial === "function" ? initial() : initial,
        () => {},
      ],
      useRef: (current: unknown) => ({ current }),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "node:crypto": { randomUUID },
    "@raycast/api": {
      Action: { SubmitForm: "SubmitForm" },
      ActionPanel: "ActionPanel",
      Form: {
        TextField: "TextField",
        TextArea: "TextArea",
        Description: "Description",
        Separator: "Separator",
        Dropdown: { Item: "Item" },
      },
      Icon: { CheckCircle: "CheckCircle" },
      Toast: { Style: { Success: "Success", Failure: "Failure" } },
      showToast: async (toast: Toast) => {
        toasts.push(toast);
      },
      useNavigation: () => ({ pop }),
    },
    "./lib/prompt-urls.js": { AI_SERVICES },
    "./lib/presets.js": { DEFAULT_SERVICE_COUNTS },
    "./lib/preset-storage.js": {
      upsertPreset: (
        preset: PromptPreset,
        _storage: unknown,
        options: SyncOptions,
      ) => save(preset, options),
    },
  };
  runInNewContext(compiled, {
    exports,
    require: (specifier: string) => {
      assert.ok(specifier in modules, `Unexpected import: ${specifier}`);
      return modules[specifier];
    },
  });
  const render = exports.PresetConfigForm as (props: {
    onSave: (preset: PromptPreset) => void;
  }) => {
    props: {
      actions: {
        props: {
          children: { props: { onSubmit: (values: unknown) => Promise<void> } };
        };
      };
    };
  };
  const form = render({
    onSave: (preset) => {
      saved.push(preset);
    },
  });
  const submit = () =>
    form.props.actions.props.children.props.onSubmit({
      name: "Test",
      template: "Hello",
      chatgpt: "1",
      claude: "0",
      grok: "0",
      perplexity: "0",
    });
  return { submit, saved, toasts };
}

test("creation retries retain the committed preset ID after a navigation failure", async () => {
  const records = new Map<string, PromptPreset>();
  let navigationCalls = 0;
  const form = formHarness(
    async (preset) => {
      records.set(preset.id, preset);
    },
    async () => {
      if (++navigationCalls === 1) throw new Error("Navigation failed");
    },
  );
  await form.submit();
  await form.submit();
  assert.equal(records.size, 1);
  assert.equal(form.saved.length, 2);
  assert.equal(form.saved[0].id, form.saved[1].id);
});

test("a committed save with cloud failure updates the UI and reports local success", async () => {
  let popped = false;
  const form = formHarness(
    async (_preset, options) => {
      options.onSyncError?.(new Error("Cloud unavailable"));
    },
    async () => {
      popped = true;
    },
  );
  await form.submit();
  assert.equal(form.saved.length, 1);
  assert.equal(popped, true);
  assert.match(form.toasts.at(-1)!.title, /Saved Test on this Mac/);
  assert.match(
    form.toasts.at(-1)!.message!,
    /iCloud sync pending: Cloud unavailable/,
  );
});

test("a local write failure does not notify onSave or close the form", async () => {
  let popped = false;
  const form = formHarness(
    async () => {
      throw new Error("Local write failed");
    },
    async () => {
      popped = true;
    },
  );
  await form.submit();
  assert.equal(form.saved.length, 0);
  assert.equal(popped, false);
  assert.equal(form.toasts.at(-1)!.title, "Could not save prompt");
});

test("a second submission cannot start while the first save is pending", async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const form = formHarness(async () => {
    calls++;
    await pending;
  });
  const first = form.submit();
  await form.submit();
  assert.equal(calls, 1);
  release();
  await first;
  assert.equal(form.saved.length, 1);
});
